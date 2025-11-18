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
// QUERY DEBUG LOGGER
// ============================================================================

interface LogEntry {
  step: number;
  timestamp: string;
  phase: string;
  elapsedMs: number;
  elapsedSeconds: number;
  narrative: string;
  details: any;
  duration?: number;
}

class QueryDebugLogger {
  private logEntries: LogEntry[] = [];
  private startTime: number;
  private stepCounter: number = 0;
  private queryTitle: string;
  private logFilePath: string;
  private query: string;

  constructor(query: string) {
    this.startTime = Date.now();
    this.query = query;
    this.queryTitle = this.generateQueryTitle(query);
    this.logFilePath = this.createLogFilePath();
    
    this.log('INITIALIZATION', {
      message: `Starting Hybrid RAG processing for query: "${query}"`,
      query,
      queryTitle: this.queryTitle,
      timestamp: new Date().toISOString(),
      logFile: this.logFilePath
    });
  }

  private generateQueryTitle(query: string): string {
    // Extract meaningful title from query (max 50 chars)
    const cleaned = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    return cleaned || 'unknown-query';
  }

  private createLogFilePath(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                      new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].substring(0, 8);
    const logsDir = path.join(process.cwd(), 'logs', 'hybrid-rag-queries');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    return path.join(logsDir, `${timestamp}_${this.queryTitle}.json`);
  }

  private formatNarrative(phase: string, details: any): string {
    // Create human-readable narrative for each phase
    switch (phase) {
      case 'INITIALIZATION':
        return `🚀 Started processing your question: "${details.query}"`;
      
      case 'REQUEST_RECEIVED':
        const mode = details.hybridSearchAvailable ? 'hybrid (semantic + keyword)' : 'vector-only';
        return `📋 Configuration loaded. Using ${mode} search mode with ${details.config?.topK || 'default'} results per method.`;
      
      case 'QUERY_CLASSIFICATION':
        const intents = details.intents?.join(', ') || 'general query';
        const datasets = details.recommendedDatasets?.length || 0;
        return `🔍 Analyzed your question and identified it as: ${intents}. This will search ${datasets} specialized knowledge bases.`;
      
      case 'NAMESPACE_TARGETING':
        const namespaces = details.targetNamespaces?.join(', ') || 'all namespaces';
        const costSaving = details.estimatedCostSavings || 'unknown';
        return `🎯 Targeting specific knowledge bases: ${namespaces}. This focused search saves ${costSaving} in processing costs.`;
      
      case 'QUERY_EXPANSION':
        const original = details.original;
        const expanded = details.expanded?.length || 0;
        return `📝 Generated ${expanded} variations of your question to improve search coverage. Original: "${original}"`;
      
      case 'SEARCH_INITIATION':
        const vectorK = details.vectorConfig?.topK || 0;
        const keywordK = details.keywordConfig?.topK || 0;
        return `🔎 Starting parallel search: Vector search (${vectorK} results) + BM25 keyword search (${keywordK} results)`;
      
      case 'SEARCH_COMPLETED':
        const vectorCount = details.vectorResults?.count || 0;
        const vectorTopScore = details.vectorResults?.topScores?.[0] || 'N/A';
        const keywordCount = details.keywordResults?.count || 0;
        const keywordTopScore = details.keywordResults?.topScores?.[0] || 'N/A';
        const duration = details.durationMs ? `${(details.durationMs / 1000).toFixed(2)}s` : 'unknown';
        return `✅ Search completed in ${duration}. Found ${vectorCount} documents via semantic search (best score: ${vectorTopScore}) and ${keywordCount} via keyword matching (best score: ${keywordTopScore}).`;
      
      case 'HYBRID_SCORING':
        const total = details.totalResults || 0;
        const unique = details.uniqueResults || 0;
        const duplicates = total - unique;
        const alpha = details.alpha || 0.7;
        return `⚖️ Combined results using ${Math.round(alpha * 100)}% semantic + ${Math.round((1 - alpha) * 100)}% keyword weighting. Found ${total} total matches, removed ${duplicates} duplicates, keeping ${unique} unique documents.`;
      
      case 'RELEVANCE_FILTERING':
        const beforeFilter = details.beforeFiltering || 0;
        const afterFilter = details.afterFiltering || 0;
        const threshold = details.threshold || 0;
        const removed = beforeFilter - afterFilter;
        return `🔬 Applied relevance filter (threshold: ${threshold}). Removed ${removed} low-quality matches, keeping ${afterFilter} highly relevant documents.`;
      
      case 'CONTEXT_PREPARATION':
        const topResults = details.topResults || 0;
        const totalChars = details.totalCharacters || 0;
        const avgScore = details.averageScore || 0;
        return `📚 Prepared context from top ${topResults} documents (${totalChars.toLocaleString()} characters total, avg. relevance: ${avgScore.toFixed(3)}) for AI response generation.`;
      
      case 'LLM_GENERATION_START':
        const model = details.model || 'unknown';
        const temp = details.temperature || 0;
        return `🤖 Generating response using ${model} (temperature: ${temp}). This creates a natural, context-aware answer based on the retrieved Ayurvedic knowledge.`;
      
      case 'RESPONSE_STREAMING':
        const totalTime = details.totalDurationMs ? `${(details.totalDurationMs / 1000).toFixed(2)}s` : 'unknown';
        return `✨ Response completed successfully! Total processing time: ${totalTime}`;
      
      case 'ERROR':
        const error = details.error || 'Unknown error';
        return `❌ Error occurred: ${error}`;
      
      default:
        return `Processing step: ${phase}`;
    }
  }

  log(phase: string, details: any) {
    const timestamp = Date.now();
    const elapsedMs = timestamp - this.startTime;
    const narrative = this.formatNarrative(phase, details);
    
    const entry: LogEntry = {
      step: ++this.stepCounter,
      timestamp: new Date(timestamp).toISOString(),
      phase,
      elapsedMs,
      elapsedSeconds: parseFloat((elapsedMs / 1000).toFixed(2)),
      narrative,
      details,
      duration: elapsedMs
    };

    this.logEntries.push(entry);

    // Also log to console for real-time monitoring with narrative
    console.log(`\n[${entry.step}] ${phase} (${elapsedMs}ms):`);
    console.log(narrative);
  }

  async saveLog() {
    try {
      const totalDuration = Date.now() - this.startTime;
      const summary = {
        // Human-readable summary at the top
        summary: {
          query: this.query,
          queryTitle: this.queryTitle,
          totalSteps: this.stepCounter,
          totalDurationSeconds: parseFloat((totalDuration / 1000).toFixed(2)),
          timestamp: new Date().toISOString(),
          outcome: this.logEntries.some(e => e.phase === 'ERROR') ? 'ERROR' : 'SUCCESS'
        },
        
        // Step-by-step narrative
        narrative: this.logEntries.map(entry => ({
          step: entry.step,
          time: `${entry.elapsedSeconds}s`,
          phase: entry.phase,
          what_happened: entry.narrative
        })),
        
        // Technical details for debugging
        technicalLog: this.logEntries
      };

      fs.writeFileSync(this.logFilePath, JSON.stringify(summary, null, 2), 'utf-8');
      console.log(`\n✅ Debug log saved: ${this.logFilePath}`);
      
      return this.logFilePath;
    } catch (error) {
      console.error('❌ Failed to save debug log:', error);
      return null;
    }
  }

  getLogFilePath(): string {
    return this.logFilePath;
  }
}

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
// INITIALIZATION LOGGER
// ============================================================================
function createInitializationLog(datasetCount: number, datasetNames: string[]) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                      new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].substring(0, 8);
    const logsDir = path.join(process.cwd(), 'logs', 'hybrid-rag-queries');
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const logFilePath = path.join(logsDir, `${timestamp}_init.json`);
    
    const initLog = {
      summary: {
        event: 'HYBRID_RAG_INITIALIZATION',
        timestamp: new Date().toISOString(),
        status: isPineconeAvailable ? 'READY' : 'FALLBACK_MODE'
      },
      
      narrative: [
        {
          step: 1,
          what_happened: isPineconeAvailable 
            ? '✅ Hybrid RAG system successfully initialized with Pinecone vector database connection'
            : '⚠️ Hybrid RAG system initialized in fallback mode (Pinecone unavailable, using local data only)'
        },
        {
          step: 2,
          what_happened: datasetCount > 0
            ? `📚 Loaded ${datasetCount} local knowledge bases: ${datasetNames.join(', ')}`
            : '⚠️ No local knowledge bases loaded'
        },
        {
          step: 3,
          what_happened: isPineconeAvailable
            ? `🔗 Connected to Pinecone index: "${PINECONE_CONFIG.indexName}" with embedding model: text-embedding-3-small`
            : '💾 Operating with local embeddings and BM25 keyword search only'
        },
        {
          step: 4,
          what_happened: `⚙️ Hybrid search configured with ${Math.round(HYBRID_ALPHA * 100)}% semantic weight and ${Math.round((1 - HYBRID_ALPHA) * 100)}% keyword weight`
        },
        {
          step: 5,
          what_happened: '🎯 Query classification, expansion, and namespace targeting features enabled'
        },
        {
          step: 6,
          what_happened: '✨ System ready to process Ayurvedic medicine queries with advanced RAG pipeline'
        }
      ],
      
      technicalDetails: {
        pinecone: {
          available: isPineconeAvailable,
          indexName: PINECONE_CONFIG.indexName,
          environment: PINECONE_CONFIG.environment,
          embeddingModel: 'text-embedding-3-small'
        },
        localDatasets: {
          count: datasetCount,
          names: datasetNames
        },
        configuration: {
          hybridAlpha: HYBRID_ALPHA,
          topK: 8,
          queryExpansionEnabled: ENABLE_QUERY_EXPANSION,
          queryClassificationEnabled: true,
          namespaceTargetingEnabled: true,
          useHybridScoring: USE_HYBRID_SCORING
        },
        timestamp: new Date().toISOString()
      }
    };
    
    fs.writeFileSync(logFilePath, JSON.stringify(initLog, null, 2), 'utf-8');
    console.log(`\n📝 Initialization log created: ${logFilePath}`);
    
    return logFilePath;
  } catch (error) {
    console.error('❌ Failed to create initialization log:', error);
    return null;
  }
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
    
    // Create initialization log after system is ready
    createInitializationLog(
      loadedDatasets.length,
      loadedDatasets.map(d => d.name)
    );
  } else {
    console.error('❌ No local datasets found, local search will be unavailable');
    createInitializationLog(0, []);
  }
} catch (error) {
  console.error('❌ Failed to load local datasets:', error);
  createInitializationLog(0, []);
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
  let logger: QueryDebugLogger | null = null;

  try {
    const { messages } = await req.json();
    const userQuestion = messages[messages.length - 1]?.content || '';

    if (!userQuestion) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 });
    }

    // Initialize debug logger
    logger = new QueryDebugLogger(userQuestion);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 HYBRID RAG QUERY: "${userQuestion}"`);
    console.log(`${'='.repeat(80)}\n`);

    logger.log('REQUEST_RECEIVED', {
      query: userQuestion,
      messageCount: messages.length,
      configuration: {
        useHybridScoring: USE_HYBRID_SCORING,
        hybridAlpha: HYBRID_ALPHA,
        enableQueryExpansion: ENABLE_QUERY_EXPANSION,
        maxQueryExpansions: MAX_QUERY_EXPANSIONS
      },
      availability: {
        pinecone: isPineconeAvailable,
        localDatasets: localLoader !== null
      }
    });

    // Step 1: Query Classification
    const classificationStart = Date.now();
    const recommendedDatasets = QueryClassifier.getRecommendedDatasets(userQuestion);
    const intents = QueryClassifier.classifyIntent(userQuestion);
    const classificationDuration = Date.now() - classificationStart;
    
    console.log(`📋 Query Classification:`);
    console.log(`   - Intents: ${intents.join(', ')}`);
    console.log(`   - Recommended datasets: ${recommendedDatasets.join(', ')}`);

    logger.log('QUERY_CLASSIFICATION', {
      intents,
      recommendedDatasets,
      classificationDuration,
      method: 'QueryClassifier.classifyIntent() + getRecommendedDatasets()'
    });

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

    logger.log('NAMESPACE_TARGETING', {
      allNamespaces,
      targetNamespaces,
      reduction: `${allNamespaces.length} → ${targetNamespaces.length}`,
      costSavings: `${((1 - targetNamespaces.length / allNamespaces.length) * 100).toFixed(0)}%`
    });

    // Step 2: Query Expansion
    const expansionStart = Date.now();
    let queryVariants = [userQuestion];
    if (ENABLE_QUERY_EXPANSION) {
      const expanded = QueryExpander.expandQuery(userQuestion);
      queryVariants = [userQuestion, ...expanded.slice(0, MAX_QUERY_EXPANSIONS - 1)];
      queryExpansions = queryVariants.length;
      console.log(`📝 Query expansion: ${queryExpansions} variants`);
    }
    const expansionDuration = Date.now() - expansionStart;

    logger.log('QUERY_EXPANSION', {
      enabled: ENABLE_QUERY_EXPANSION,
      originalQuery: userQuestion,
      expandedQueries: queryVariants,
      variantCount: queryExpansions,
      expansionDuration,
      method: 'QueryExpander.expandQuery()'
    });

    // Step 3: Parallel Search - Vector + Keyword
    logger.log('SEARCH_INITIATION', {
      vectorSearchEnabled: isPineconeAvailable,
      keywordSearchEnabled: localLoader !== null,
      parallelSearches: 2,
      vectorConfig: isPineconeAvailable ? {
        index: PINECONE_CONFIG.indexName,
        namespaces: targetNamespaces,
        queryVariants: queryVariants.length,
        maxChunksPerVariant: 6
      } : null,
      keywordConfig: localLoader ? {
        datasets: recommendedDatasets,
        maxChunks: 10,
        algorithm: 'BM25'
      } : null
    });

    const searchPromises: Promise<DocumentWithScore[]>[] = [];
    const searchStart = Date.now();

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
    const searchDuration = Date.now() - searchStart;

    logger.log('SEARCH_COMPLETED', {
      searchDuration,
      vectorResults: {
        count: vectorResults.length,
        topScores: vectorResults.slice(0, 3).map(r => r.score.toFixed(4)),
        sources: vectorResults.map(r => r.namespace).filter(Boolean)
      },
      keywordResults: {
        count: keywordResults.length,
        topScores: keywordResults.slice(0, 3).map(r => r.score.toFixed(4)),
        sources: keywordResults.map(r => r.source)
      },
      totalResultsFound: vectorResults.length + keywordResults.length
    });

    // Step 4: Determine RAG mode and combine results
    const hybridScoringStart = Date.now();
    let finalResults: DocumentWithScore[];

    if (vectorResults.length > 0 && keywordResults.length > 0 && USE_HYBRID_SCORING) {
      // Hybrid mode: combine both
      ragMode = 'hybrid';
      console.log(`\n🎯 Mode: HYBRID (${vectorResults.length} vector + ${keywordResults.length} keyword)`);
      finalResults = hybridScore(vectorResults, keywordResults, HYBRID_ALPHA);
      
      logger.log('HYBRID_SCORING', {
        mode: 'hybrid',
        hybridAlpha: HYBRID_ALPHA,
        vectorWeight: `${(HYBRID_ALPHA * 100).toFixed(0)}%`,
        keywordWeight: `${((1 - HYBRID_ALPHA) * 100).toFixed(0)}%`,
        inputResults: {
          vector: vectorResults.length,
          keyword: keywordResults.length
        },
        outputResults: finalResults.length,
        deduplication: `${vectorResults.length + keywordResults.length} → ${finalResults.length}`,
        hybridMatches: finalResults.filter(r => r.source === 'hybrid').length,
        scoringDuration: Date.now() - hybridScoringStart
      });
    } else if (vectorResults.length > 0) {
      // Vector-only mode
      ragMode = 'vector-only';
      console.log(`\n📊 Mode: VECTOR-ONLY (${vectorResults.length} results)`);
      finalResults = vectorResults.sort((a, b) => b.score - a.score);
      
      logger.log('MODE_SELECTION', {
        mode: 'vector-only',
        reason: keywordResults.length === 0 ? 'No keyword results' : 'Hybrid scoring disabled',
        resultCount: vectorResults.length
      });
    } else if (keywordResults.length > 0) {
      // Local-only fallback
      ragMode = 'local-only';
      console.log(`\n📚 Mode: LOCAL-ONLY (${keywordResults.length} results)`);
      finalResults = keywordResults;
      
      logger.log('MODE_SELECTION', {
        mode: 'local-only',
        reason: 'No vector results (Pinecone unavailable or no matches)',
        resultCount: keywordResults.length,
        fallback: true
      });
    } else {
      // No results from any source
      console.log('\n⚠️ No results from any search method');
      
      logger.log('NO_RESULTS', {
        mode: 'no-results',
        vectorAvailable: isPineconeAvailable,
        keywordAvailable: localLoader !== null,
        reason: 'No matches from any search method'
      });

      await logger.saveLog();

      return NextResponse.json({
        message: "I don't have specific information about this topic in my current knowledge base. Please consult with a qualified Ayurvedic practitioner for personalized guidance.",
        query: userQuestion,
        mode: 'no-results',
        documentsFound: 0
      });
    }

    // Step 5: Filter by relevance
    const filteringStart = Date.now();
    const relevantResults = finalResults.filter(result =>
      result.score > 0.1 && // Minimum threshold
      RelevanceFilter.isRelevant(userQuestion, result.chunk.text, result.score)
    );
    const filteringDuration = Date.now() - filteringStart;

    console.log(`\n📊 Results Summary:`);
    console.log(`   - Vector results: ${vectorResults.length}`);
    console.log(`   - Keyword results: ${keywordResults.length}`);
    console.log(`   - Combined/filtered: ${finalResults.length} → ${relevantResults.length}`);

    logger.log('RELEVANCE_FILTERING', {
      filteringDuration,
      inputResults: finalResults.length,
      outputResults: relevantResults.length,
      filtered: finalResults.length - relevantResults.length,
      minimumThreshold: 0.1,
      filterMethod: 'RelevanceFilter.isRelevant()',
      topScores: relevantResults.slice(0, 5).map(r => ({
        score: r.score.toFixed(4),
        source: r.source,
        preview: r.chunk.text.substring(0, 100)
      }))
    });

    // Step 6: Format context with citations
    const topResults = relevantResults.slice(0, 10);
    
    logger.log('CONTEXT_PREPARATION', {
      selectedResults: topResults.length,
      maxResults: 10,
      results: topResults.map((r, idx) => ({
        rank: idx + 1,
        score: r.score.toFixed(4),
        source: r.source,
        namespace: r.namespace || 'default',
        page: r.chunk.page || r.metadata?.page_number,
        textLength: r.chunk.text.length,
        preview: r.chunk.text.substring(0, 150) + '...'
      }))
    });
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
    const llmStart = Date.now();
    
    logger.log('LLM_GENERATION_START', {
      model: 'gpt-4o-mini',
      temperature: 0.3,
      streaming: true,
      contextLength: contextWithCitations.length,
      documentCount: topResults.length,
      promptTemplate: 'Hybrid RAG with citation instructions'
    });

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

    logger.log('RESPONSE_STREAMING', {
      llmSetupDuration: Date.now() - llmStart,
      totalProcessingTime: totalTime,
      streamingStarted: true,
      responseHeaders: {
        'X-RAG-Mode': ragMode,
        'X-Vector-Results': vectorResults.length,
        'X-Local-Results': keywordResults.length,
        'X-Hybrid-Alpha': HYBRID_ALPHA,
        'X-Query-Expansions': queryExpansions,
        'X-Namespaces-Searched': namespacesSearched.join(','),
        'X-Processing-Time-Ms': totalTime
      }
    });

    // Save log asynchronously (don't block response)
    logger.saveLog().catch(err => console.error('Failed to save log:', err));

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
    
    // Log error details
    if (logger) {
      logger.log('ERROR', {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        ragMode,
        vectorResults: vectorResults.length,
        keywordResults: keywordResults.length,
        queryExpansions,
        namespacesSearched,
        totalDuration: Date.now() - startTime
      });
      
      // Save error log
      await logger.saveLog().catch(err => console.error('Failed to save error log:', err));
    }
    
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
