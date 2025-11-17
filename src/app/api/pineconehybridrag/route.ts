import { NextRequest, NextResponse } from 'next/server';
import { StreamingTextResponse, createStreamDataTransformer } from 'ai';
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { HttpResponseOutputParser } from 'langchain/output_parsers';
import { Document } from 'langchain/document';
import { type AyurvedaMetadata } from '../../../lib/vector-store';
import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  QueryClassifier,
  QueryExpander,
  HybridSearch,
  RelevanceFilter,
} from '../../../lib/rag-enhancements';

export const dynamic = 'force-dynamic';

// ============================================================================
// HYBRID RAG CONFIGURATION
// ============================================================================

// Hybrid scoring configuration
const USE_HYBRID_SCORING = process.env.USE_HYBRID_SCORING !== 'false'; // Default: true
const HYBRID_ALPHA = parseFloat(process.env.HYBRID_ALPHA || '0.7'); // 70% vector, 30% keyword
const ENABLE_QUERY_EXPANSION = process.env.ENABLE_QUERY_EXPANSION !== 'false'; // Default: true
const MAX_QUERY_EXPANSIONS = 3; // Limit for cost control

// Dataset to Pinecone namespace mapping
const PINECONE_NAMESPACE_MAP: Record<string, string> = {
  'ayurcheck_rag.json': '', // default namespace (pharmacopoeia)
  'ayu_skinDiseases_rag.json': 'skin-diseases',
  'ayu_mentalDisorders_rag.json': 'mental-disorders',
};

// Pinecone configuration
const PINECONE_CONFIG = {
  apiKey: process.env.PINECONE_API_KEY!,
  indexName: process.env.PINECONE_INDEX_NAME || 'ayurveda-knowledge',
  environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws',
  dimension: 1536, // text-embedding-3-small dimensions
};

console.log('🔧 Hybrid RAG Configuration:');
console.log(`   - Hybrid scoring: ${USE_HYBRID_SCORING ? 'ENABLED' : 'DISABLED'}`);
console.log(`   - HYBRID_ALPHA: ${HYBRID_ALPHA} (${(HYBRID_ALPHA * 100).toFixed(0)}% vector, ${((1 - HYBRID_ALPHA) * 100).toFixed(0)}% keyword)`);
console.log(`   - Query expansion: ${ENABLE_QUERY_EXPANSION ? 'ENABLED' : 'DISABLED'}`);
console.log(`   - Pinecone index: ${PINECONE_CONFIG.indexName}`);

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize Pinecone client
let pineconeClient: Pinecone | null = null;
let pineconeIndex: any = null;
let embeddingsClient: OpenAIEmbeddings | null = null;
let isPineconeAvailable = false;

try {
  pineconeClient = new Pinecone({
    apiKey: PINECONE_CONFIG.apiKey,
  });
  pineconeIndex = pineconeClient.index(PINECONE_CONFIG.indexName);
  embeddingsClient = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'text-embedding-3-small',
    batchSize: 512,
  });
  isPineconeAvailable = true;
  console.log('✅ Pinecone integration initialized');
} catch (error) {
  console.error('⚠️ Failed to initialize Pinecone, will use local-only mode:', error);
  isPineconeAvailable = false;
}

// ============================================================================
// LOCAL DATA STRUCTURES
// ============================================================================

interface RAGChunk {
  id: string;
  text: string;
  type: string;
  section?: string;
  subsection?: string;
  bbox?: number[];
  page?: number;
}

interface RAGData {
  source: string;
  title: string;
  total_pages: number;
  total_chunks: number;
  pages: {
    [key: string]: {
      page_number: number;
      chunks: RAGChunk[];
    };
  };
  extraction_stats?: {
    text_chunks: number;
    table_chunks: number;
    formula_chunks: number;
  };
}

interface DocumentWithScore {
  chunk: RAGChunk;
  score: number;
  source: 'vector' | 'keyword' | 'hybrid';
  namespace?: string;
  metadata?: AyurvedaMetadata;
}

// ============================================================================
// LOCAL DATASET LOADER
// ============================================================================

class HybridAyurvedicRAGLoader {
  private datasets: Map<string, RAGData> = new Map();
  private datasetNames: string[] = [];
  private corpusStats: { totalDocs: number; avgDocLength: number } = { totalDocs: 0, avgDocLength: 0 };

  constructor(ragDatasets: { name: string; data: RAGData }[]) {
    let totalLength = 0;
    let totalDocs = 0;

    for (const dataset of ragDatasets) {
      this.datasets.set(dataset.name, dataset.data);
      this.datasetNames.push(dataset.name);

      // Calculate corpus statistics for BM25
      for (const pageKey in dataset.data.pages) {
        const page = dataset.data.pages[pageKey];
        for (const chunk of page.chunks) {
          totalDocs++;
          totalLength += chunk.text.split(/\s+/).length;
        }
      }
    }

    this.corpusStats.totalDocs = totalDocs;
    this.corpusStats.avgDocLength = totalDocs > 0 ? totalLength / totalDocs : 500;

    console.log(`✅ Loaded ${this.datasets.size} local datasets: ${this.datasetNames.join(', ')}`);
    console.log(`📊 Corpus stats: ${totalDocs} documents, avg length: ${this.corpusStats.avgDocLength.toFixed(0)} words`);
  }

  /**
   * Search local datasets using BM25 keyword scoring
   */
  searchLocalDatasets(
    query: string,
    recommendedDatasets: string[],
    maxChunks = 10
  ): DocumentWithScore[] {
    console.log('🔍 Performing local BM25 keyword search...');
    
    const allResults: DocumentWithScore[] = [];
    
    // Determine which datasets to search
    const datasetsToSearch = this.datasetNames.filter(name =>
      recommendedDatasets.some(rec => name.includes(rec.replace('.json', '')))
    );
    const searchDatasets = datasetsToSearch.length > 0 ? datasetsToSearch : this.datasetNames;

    for (const datasetName of searchDatasets) {
      const data = this.datasets.get(datasetName);
      if (!data) continue;

      for (const pageKey in data.pages) {
        const page = data.pages[pageKey];
        for (const chunk of page.chunks) {
          // Calculate BM25 score
          const bm25Score = HybridSearch.calculateKeywordScore(query, chunk.text);
          
          if (bm25Score > 0) {
            allResults.push({
              chunk,
              score: bm25Score,
              source: 'keyword',
            });
          }
        }
      }
    }

    // Sort by BM25 score and normalize to 0-1 range
    allResults.sort((a, b) => b.score - a.score);
    const maxScore = allResults[0]?.score || 1;
    allResults.forEach(result => {
      result.score = result.score / maxScore;
    });

    const topResults = allResults.slice(0, maxChunks);
    console.log(`   Found ${allResults.length} keyword matches, returning top ${topResults.length}`);
    
    return topResults;
  }
}

// Load local datasets on module initialization
let localLoader: HybridAyurvedicRAGLoader | null = null;

try {
  const dataDir = path.join(process.cwd(), 'src', 'data');
  const datasets = [
    { name: 'ayurcheck_rag.json', path: path.join(dataDir, 'ayurcheck_rag.json') },
    { name: 'ayu_skinDiseases_rag.json', path: path.join(dataDir, 'ayu_skinDiseases_rag.json') },
    { name: 'ayu_mentalDisorders_rag.json', path: path.join(dataDir, 'ayu_mentalDisorders_rag.json') },
  ];

  const loadedDatasets: { name: string; data: RAGData }[] = [];
  for (const dataset of datasets) {
    if (fs.existsSync(dataset.path)) {
      const data = JSON.parse(fs.readFileSync(dataset.path, 'utf-8'));
      loadedDatasets.push({ name: dataset.name, data });
    } else {
      console.log(`⚠️ Dataset not found: ${dataset.path}`);
    }
  }

  if (loadedDatasets.length > 0) {
    localLoader = new HybridAyurvedicRAGLoader(loadedDatasets);
  } else {
    console.error('❌ No local datasets found, local search will be unavailable');
  }
} catch (error) {
  console.error('❌ Failed to load local datasets:', error);
}

// ============================================================================
// VECTOR SEARCH WITH NAMESPACE TARGETING
// ============================================================================

async function searchWithPinecone(
  query: string,
  queryVariants: string[],
  targetNamespaces: string[],
  maxChunksPerVariant = 6
): Promise<DocumentWithScore[]> {
  if (!isPineconeAvailable || !pineconeIndex || !embeddingsClient) {
    console.log('⚠️ Pinecone not available, skipping vector search');
    return [];
  }

  try {
    console.log(`🚀 Pinecone vector search with ${queryVariants.length} query variants across ${targetNamespaces.length} namespaces`);
    
    const allMatches: DocumentWithScore[] = [];

    // Batch generate embeddings for all query variants
    const embeddings = await embeddingsClient.embedDocuments(queryVariants);

    // Search each query variant across target namespaces
    for (let i = 0; i < queryVariants.length; i++) {
      const variant = queryVariants[i];
      const embedding = embeddings[i];

      // Search each target namespace
      for (const namespace of targetNamespaces) {
        try {
          const nsIndex = pineconeIndex.namespace(namespace);
          const response = await nsIndex.query({
            vector: embedding,
            topK: maxChunksPerVariant,
            includeMetadata: true,
            includeValues: false,
          });

          // Convert Pinecone matches to DocumentWithScore format
          for (const match of response.matches || []) {
            const metadata = match.metadata || {};
            
            const chunk: RAGChunk = {
              id: match.id,
              text: (metadata.content || metadata.text || '') as string,
              type: (metadata.type || 'text') as string,
              section: metadata.section as string | undefined,
              subsection: metadata.subsection as string | undefined,
              page: (metadata.page || metadata.page_number) as number | undefined,
            };

            allMatches.push({
              chunk,
              score: match.score || 0,
              source: 'vector',
              namespace: namespace || 'default',
              metadata: metadata as AyurvedaMetadata,
            });
          }
        } catch (error) {
          console.error(`❌ Error searching namespace "${namespace}":`, error);
        }
      }
    }

    console.log(`   Found ${allMatches.length} vector matches from Pinecone`);
    return allMatches;

  } catch (error) {
    console.error('❌ Pinecone search failed:', error);
    return [];
  }
}

// ============================================================================
// HYBRID SCORING AND DEDUPLICATION
// ============================================================================

function hybridScore(
  vectorResults: DocumentWithScore[],
  keywordResults: DocumentWithScore[],
  alpha = HYBRID_ALPHA
): DocumentWithScore[] {
  console.log(`🎯 Combining scores with alpha=${alpha} (${(alpha * 100).toFixed(0)}% vector, ${((1 - alpha) * 100).toFixed(0)}% keyword)`);

  // Normalize vector scores (already 0-1 from Pinecone cosine similarity)
  const maxVectorScore = Math.max(...vectorResults.map(r => r.score), 1e-6);
  const normalizedVector = vectorResults.map(r => ({
    ...r,
    score: r.score / maxVectorScore,
  }));

  // Keyword scores already normalized in searchLocalDatasets
  const normalizedKeyword = keywordResults;

  // Create map of all chunks with combined scores
  const chunkMap = new Map<string, {
    result: DocumentWithScore;
    vectorScore: number;
    keywordScore: number;
  }>();

  // Add vector results
  for (const result of normalizedVector) {
    const key = result.chunk.id || result.chunk.text.slice(0, 200);
    chunkMap.set(key, {
      result: { ...result, source: 'vector' },
      vectorScore: result.score,
      keywordScore: 0,
    });
  }

  // Add/merge keyword results
  for (const result of normalizedKeyword) {
    const key = result.chunk.id || result.chunk.text.slice(0, 200);
    const existing = chunkMap.get(key);
    
    if (existing) {
      existing.keywordScore = result.score;
      existing.result.source = 'hybrid'; // Mark as hybrid if found in both
    } else {
      chunkMap.set(key, {
        result: { ...result, source: 'keyword' },
        vectorScore: 0,
        keywordScore: result.score,
      });
    }
  }

  // Calculate final hybrid scores
  const hybridResults: DocumentWithScore[] = Array.from(chunkMap.values()).map(entry => ({
    ...entry.result,
    score: alpha * entry.vectorScore + (1 - alpha) * entry.keywordScore,
  }));

  // Sort by final hybrid score
  hybridResults.sort((a, b) => b.score - a.score);

  console.log(`   Combined ${vectorResults.length} vector + ${keywordResults.length} keyword = ${hybridResults.length} unique results`);
  console.log(`   Hybrid matches: ${hybridResults.filter(r => r.source === 'hybrid').length}`);

  return hybridResults;
}

// ============================================================================
// PROMPT TEMPLATE
// ============================================================================

const ragPromptTemplate = PromptTemplate.fromTemplate(`
You are an expert Ayurvedic medicine consultant with deep knowledge of traditional Indian medicine practices. 
You have access to authoritative Ayurvedic texts through a HYBRID RETRIEVAL SYSTEM combining:
1. **Vector similarity search** (Pinecone cloud database) - semantic understanding
2. **BM25 keyword search** (local knowledge base) - precise term matching

Context from Ayurvedic Knowledge Base (retrieved via hybrid search):
{context}

User Question: {question}

CRITICAL CITATION RULES:
1. **Every factual claim MUST include an inline citation** in this exact format:
   【Source Document†Topic/Herb†Page X】
   
   Examples:
   - 【Ayurvedic Pharmacopoeia Vol-1†Haridra†Page 89】
   - 【Ayurveda Guidelines for Skin Diseases†Page 23】
   - 【Ayurveda Guidelines for Mental Health†Page 45】

2. **What to cite:**
   - Herbal properties or benefits
   - Therapeutic uses or indications
   - Dosage recommendations
   - Contraindications or side effects
   - Traditional Ayurvedic knowledge
   - Specific formulations or preparations
   - Clinical guidelines and protocols

3. **Citation placement:**
   - Place immediately after the relevant sentence or paragraph
   - Group related facts from the same source under one citation
   - If discussing multiple herbs/topics, cite each separately

4. **Search method transparency (optional):**
   - When relevant, you may indicate if information came from semantic search (vector) or keyword matching (BM25)
   - Example: "According to the texts (semantic match)..." or "The guidelines specifically mention (keyword match)..."

5. **When information is unavailable:**
   - State: "The retrieved Ayurvedic texts do not contain specific information about [topic]."
   - Recommend consulting a qualified Ayurvedic practitioner

Instructions:
- Provide accurate, evidence-based Ayurvedic guidance with citations
- Reference specific herbs, formulations, or practices from the context
- Include dosha considerations (Vata, Pitta, Kapha) when relevant
- Mention botanical names when discussing herbs
- Include usage instructions, dosages, and contraindications with citations
- Always emphasize consulting qualified Ayurvedic practitioners for personalized treatment
- If the context doesn't contain relevant information, state this clearly
- Maintain traditional Ayurvedic terminology while being accessible to modern readers
- Leverage both semantic understanding (from vector search) and precise terminology (from keyword search)

Answer with comprehensive citations:
`);

// ============================================================================
// MAIN POST HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let ragMode: 'hybrid' | 'vector-only' | 'local-only' = 'hybrid';
  let vectorResults: DocumentWithScore[] = [];
  let keywordResults: DocumentWithScore[] = [];
  let queryExpansions = 1;
  let namespacesSearched: string[] = [];

  try {
    const { messages } = await req.json();
    const userQuestion = messages[messages.length - 1]?.content || '';

    if (!userQuestion) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 });
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 HYBRID RAG QUERY: "${userQuestion}"`);
    console.log(`${'='.repeat(80)}\n`);

    // Step 1: Query Classification
    const recommendedDatasets = QueryClassifier.getRecommendedDatasets(userQuestion);
    const intents = QueryClassifier.classifyIntent(userQuestion);
    
    console.log(`📋 Query Classification:`);
    console.log(`   - Intents: ${intents.join(', ')}`);
    console.log(`   - Recommended datasets: ${recommendedDatasets.join(', ')}`);

    // Map datasets to Pinecone namespaces
    const allNamespaces = ['', 'skin-diseases', 'skin-diseases-tables', 'mental-disorders', 'mental-disorders-tables'];
    const targetNamespaces = recommendedDatasets.length > 0
      ? allNamespaces.filter(ns => 
          recommendedDatasets.some(rec => {
            const cleanRec = rec.replace('.json', '').replace('ayu_', '').replace('rag', '').trim();
            return ns.includes(cleanRec.toLowerCase()) || ns === '';
          })
        )
      : allNamespaces;

    namespacesSearched = targetNamespaces;
    console.log(`🎯 Target namespaces: ${targetNamespaces.join(', ') || 'default'}`);

    // Step 2: Query Expansion
    let queryVariants = [userQuestion];
    if (ENABLE_QUERY_EXPANSION) {
      const expanded = QueryExpander.expandQuery(userQuestion);
      queryVariants = [userQuestion, ...expanded.slice(0, MAX_QUERY_EXPANSIONS - 1)];
      queryExpansions = queryVariants.length;
      console.log(`📝 Query expansion: ${queryExpansions} variants`);
    }

    // Step 3: Parallel Search - Vector + Keyword
    const searchPromises: Promise<DocumentWithScore[]>[] = [];

    // Vector search (Pinecone)
    if (isPineconeAvailable) {
      searchPromises.push(
        searchWithPinecone(userQuestion, queryVariants, targetNamespaces, 6)
      );
    } else {
      console.log('⚠️ Pinecone unavailable, skipping vector search');
      searchPromises.push(Promise.resolve([]));
    }

    // Keyword search (Local BM25)
    if (localLoader) {
      searchPromises.push(
        Promise.resolve(localLoader.searchLocalDatasets(userQuestion, recommendedDatasets, 10))
      );
    } else {
      console.log('⚠️ Local datasets unavailable, skipping keyword search');
      searchPromises.push(Promise.resolve([]));
    }

    // Wait for both searches
    [vectorResults, keywordResults] = await Promise.all(searchPromises);

    // Step 4: Determine RAG mode and combine results
    let finalResults: DocumentWithScore[];

    if (vectorResults.length > 0 && keywordResults.length > 0 && USE_HYBRID_SCORING) {
      // Hybrid mode: combine both
      ragMode = 'hybrid';
      console.log(`\n🎯 Mode: HYBRID (${vectorResults.length} vector + ${keywordResults.length} keyword)`);
      finalResults = hybridScore(vectorResults, keywordResults, HYBRID_ALPHA);
    } else if (vectorResults.length > 0) {
      // Vector-only mode
      ragMode = 'vector-only';
      console.log(`\n📊 Mode: VECTOR-ONLY (${vectorResults.length} results)`);
      finalResults = vectorResults.sort((a, b) => b.score - a.score);
    } else if (keywordResults.length > 0) {
      // Local-only fallback
      ragMode = 'local-only';
      console.log(`\n📚 Mode: LOCAL-ONLY (${keywordResults.length} results)`);
      finalResults = keywordResults;
    } else {
      // No results from any source
      console.log('\n⚠️ No results from any search method');
      return NextResponse.json({
        message: "I don't have specific information about this topic in my current knowledge base. Please consult with a qualified Ayurvedic practitioner for personalized guidance.",
        query: userQuestion,
        mode: 'no-results',
        documentsFound: 0
      });
    }

    // Step 5: Filter by relevance
    const relevantResults = finalResults.filter(result =>
      result.score > 0.1 && // Minimum threshold
      RelevanceFilter.isRelevant(userQuestion, result.chunk.text, result.score)
    );

    console.log(`\n📊 Results Summary:`);
    console.log(`   - Vector results: ${vectorResults.length}`);
    console.log(`   - Keyword results: ${keywordResults.length}`);
    console.log(`   - Combined/filtered: ${finalResults.length} → ${relevantResults.length}`);

    // Step 6: Format context with citations
    const topResults = relevantResults.slice(0, 10);
    const contextWithCitations = topResults.map((result, index) => {
      const namespace = result.namespace || 'default';
      const page = result.chunk.page || result.metadata?.page_number || 'N/A';
      const herbName = result.metadata?.herb_name || result.chunk.section || 'Clinical Information';
      
      // Determine source document based on namespace
      let sourceDoc = 'Ayurvedic Pharmacopoeia Vol-1';
      if (namespace.includes('skin-diseases')) {
        sourceDoc = 'Ayurveda Guidelines for Skin Diseases';
      } else if (namespace.includes('mental-disorders')) {
        sourceDoc = 'Ayurveda Guidelines for Mental Health';
      }

      const citationInfo = `【${sourceDoc}†${herbName}†Page ${page}】`;
      const searchMethod = result.source === 'hybrid' ? 'hybrid (vector+keyword)' : result.source;

      return `
--- Document ${index + 1} (${searchMethod} match, score: ${result.score.toFixed(3)}) ---
Citation: ${citationInfo}
Content:
${result.chunk.text}
---
`;
    }).join('\n');

    if (topResults.length === 0) {
      console.log('⚠️ No relevant documents found after filtering');
    } else {
      console.log(`✅ Returning ${topResults.length} documents to LLM\n`);
    }

    // Step 7: Generate response with LLM
    const chatModel = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.3,
      streaming: true,
      verbose: true,
    });

    const ragChain = RunnableSequence.from([
      {
        context: () => contextWithCitations,
        question: (input: { question: string }) => input.question,
      },
      ragPromptTemplate,
      chatModel,
      new HttpResponseOutputParser(),
    ]);

    const stream = await ragChain.stream({
      question: userQuestion,
    });

    const totalTime = Date.now() - startTime;
    console.log(`⏱️  Total processing time: ${totalTime}ms`);
    console.log(`${'='.repeat(80)}\n`);

    // Return streaming response with debug headers
    return new StreamingTextResponse(
      stream.pipeThrough(createStreamDataTransformer()),
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-RAG-Mode': ragMode,
          'X-Vector-Results': vectorResults.length.toString(),
          'X-Local-Results': keywordResults.length.toString(),
          'X-Hybrid-Alpha': HYBRID_ALPHA.toString(),
          'X-Query-Expansions': queryExpansions.toString(),
          'X-Namespaces-Searched': namespacesSearched.join(','),
          'X-Documents-Found': topResults.length.toString(),
          'X-Processing-Time-Ms': totalTime.toString(),
          'X-Vector-DB': 'Pinecone-Hybrid',
          'X-Index-Name': PINECONE_CONFIG.indexName,
        },
      }
    );

  } catch (error) {
    console.error('❌ Error in Hybrid RAG endpoint:', error);
    
    // Graceful error handling
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json({
          error: 'API key is missing or invalid',
          details: 'Please check PINECONE_API_KEY and OPENAI_API_KEY environment variables',
          mode: ragMode,
        }, { status: 401 });
      }
    }

    return NextResponse.json({
      error: 'Internal server error in Hybrid RAG processing',
      details: error instanceof Error ? error.message : 'Unknown error',
      mode: ragMode,
      vectorResults: vectorResults.length,
      keywordResults: keywordResults.length,
    }, { status: 500 });
  }
}

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const status: any = {
      status: 'healthy',
      mode: 'hybrid-rag',
      timestamp: new Date().toISOString(),
      configuration: {
        hybridScoring: USE_HYBRID_SCORING,
        hybridAlpha: HYBRID_ALPHA,
        queryExpansion: ENABLE_QUERY_EXPANSION,
        maxExpansions: MAX_QUERY_EXPANSIONS,
      },
    };

    // Check Pinecone availability
    if (isPineconeAvailable && pineconeIndex) {
      try {
        const stats = await pineconeIndex.describeIndexStats();
        status.pinecone = {
          available: true,
          indexName: PINECONE_CONFIG.indexName,
          vectorCount: stats.totalRecordCount || 0,
          dimension: PINECONE_CONFIG.dimension,
        };
      } catch (error) {
        status.pinecone = {
          available: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    } else {
      status.pinecone = { available: false };
    }

    // Check local datasets
    if (localLoader) {
      status.localDatasets = {
        available: true,
        count: 3,
      };
    } else {
      status.localDatasets = { available: false };
    }

    // Determine overall capability
    if (status.pinecone?.available && status.localDatasets?.available) {
      status.capability = 'full-hybrid';
    } else if (status.pinecone?.available) {
      status.capability = 'vector-only';
    } else if (status.localDatasets?.available) {
      status.capability = 'keyword-only';
    } else {
      status.status = 'degraded';
      status.capability = 'none';
    }

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
