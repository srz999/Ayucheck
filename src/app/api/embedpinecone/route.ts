import { NextRequest, NextResponse } from 'next/server';
import { StreamingTextResponse, createStreamDataTransformer } from 'ai';
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { formatDocumentsAsString } from 'langchain/util/document';
import { HttpResponseOutputParser } from 'langchain/output_parsers';
import { Document } from 'langchain/document';
import { type AyurvedaMetadata } from '../../../lib/vector-store';
import { HybridSearch } from '../../../lib/rag-enhancements';
import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { QueryLogger } from '../../../lib/query-logger';

export const dynamic = 'force-dynamic';

// Pinecone-specific configuration
const PINECONE_CONFIG = {
  apiKey: process.env.PINECONE_API_KEY!,
  indexName: process.env.PINECONE_INDEX_NAME || 'ayurveda-knowledge',
  environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws',
  dimension: 1536, // text-embedding-3-small dimensions
};

// Initialize Pinecone client
const pc = new Pinecone({
  apiKey: PINECONE_CONFIG.apiKey,
});

// Initialize OpenAI embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-small",
  batchSize: 512,
});

// Initialize data loading flag
let isDataLoaded = false;

async function initializePineconeIndex(): Promise<void> {
  if (isDataLoaded) return;

  try {
    const index = pc.index(PINECONE_CONFIG.indexName);
    
    // Check if index already has data
    try {
      const stats = await index.describeIndexStats();
      if (stats.totalRecordCount && stats.totalRecordCount > 0) {
        isDataLoaded = true;
        return;
      }
    } catch (error) {
      // Index not found or empty, will populate
    }

    // Load Ayurvedic RAG data from JSONL format
    const dataPath = path.join(process.cwd(), 'src', 'data', 'ayurcheck_rag.jsonl');
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Ayurvedic data file not found at: ${dataPath}`);
    }

    // Parse JSONL file (each line is a JSON object)
    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const rawData = fileContent
      .trim()
      .split('\n')
      .map(line => JSON.parse(line));

    // Convert to Document format with enhanced metadata
    const documents: Document<AyurvedaMetadata>[] = rawData.map((item: any, index: number) => {
      const content = item.text || '';
      const existingMetadata = item.metadata || {};
      
      // Enhanced metadata extraction from content
      const herbNameMatch = content.match(/(?:^|\n)([A-Z][a-z]+(?: [a-z]+)*?)(?:\s*[-–—]\s*|\s*\(|\s*:)/);
      const botanicalMatch = content.match(/\(([A-Z][a-z]+ [a-z]+(?:\s+[a-z]+)*)\)/);
      
      // Determine dosha type from content
      let doshaType: AyurvedaMetadata['dosha_type'] = undefined;
      const doshaContent = content.toLowerCase();
      if (doshaContent.includes('vata') && doshaContent.includes('pitta') && doshaContent.includes('kapha')) {
        doshaType = 'tridosha';
      } else if (doshaContent.includes('vata')) {
        doshaType = 'vata';
      } else if (doshaContent.includes('pitta')) {
        doshaType = 'pitta';
      } else if (doshaContent.includes('kapha')) {
        doshaType = 'kapha';
      }

      // Determine category from content keywords
      let category: AyurvedaMetadata['category'] = 'pharmacopoeia';
      const contentLower = content.toLowerCase();
      if (contentLower.includes('herb') || contentLower.includes('plant') || botanicalMatch) {
        category = 'herb';
      } else if (contentLower.includes('remedy') || contentLower.includes('treatment')) {
        category = 'remedy';
      } else if (contentLower.includes('lifestyle') || contentLower.includes('diet') || contentLower.includes('exercise')) {
        category = 'lifestyle';
      } else if (contentLower.includes('diagnos') || contentLower.includes('symptom')) {
        category = 'diagnosis';
      }

      const metadata: AyurvedaMetadata = {
        herb_name: herbNameMatch?.[1]?.trim(),
        botanical_name: botanicalMatch?.[1]?.trim(),
        dosha_type: doshaType,
        category,
        source_document: 'Ayurvedic Pharmacopoeia Volume 1',
        page_number: existingMetadata.page || undefined,
        document_id: item.id || `ayur_doc_${index}`,
      };

      return new Document<AyurvedaMetadata>({
        pageContent: content,
        metadata,
      });
    });

    // Generate embeddings for all documents
    const texts = documents.map(doc => doc.pageContent);
    const documentEmbeddings = await embeddings.embedDocuments(texts);

    // Prepare vectors for Pinecone
    const vectors = documents.map((doc, i) => ({
      id: `doc_${i}_${uuidv4().slice(0, 8)}`, // Pinecone-compatible ID
      values: documentEmbeddings[i],
      metadata: {
        content: doc.pageContent,
        ...doc.metadata,
      },
    }));

    // Upload vectors to Pinecone in batches
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
    }

    isDataLoaded = true;
  } catch (error) {
    console.error('❌ Error initializing Pinecone index:', error);
    throw new Error(`Failed to initialize Pinecone index: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Advanced RAG prompt template for Ayurvedic medicine with citation instructions
const ragPromptTemplate = PromptTemplate.fromTemplate(`
You are an expert Ayurvedic medicine consultant with deep knowledge of traditional Indian medicine practices. You have access to authoritative Ayurvedic texts and pharmacopoeia data through a cloud vector database powered by Pinecone.

Context from Ayurvedic Knowledge Base (with citation metadata):
{context}

User Question: {question}

CRITICAL CITATION RULES:
1. **Every factual claim MUST include an inline citation** in this exact format:
   【Ayurvedic Pharmacopoeia Vol-1†[herb_name]†Page [page_number]】

2. **What to cite:**
   - Herbal properties or benefits
   - Therapeutic uses or indications
   - Dosage recommendations
   - Contraindications or side effects
   - Traditional Ayurvedic knowledge
   - Specific formulations or preparations

3. **Citation placement:**
   - Place immediately after the relevant sentence or paragraph
   - Group related facts from the same source under one citation
   - If discussing multiple herbs, cite each separately

4. **When information is unavailable:**
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

Answer with citations:
`);

export async function POST(req: NextRequest) {
  let logger: QueryLogger | null = null;
  
  try {
    // Initialize Pinecone index with data (if not already done)
    await initializePineconeIndex();

    const { messages, useHybridSearch = true } = await req.json();
    const userQuestion = messages[messages.length - 1]?.content || '';

    if (!userQuestion) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 });
    }

    // Initialize query logger
    logger = new QueryLogger(userQuestion);
    logger.progress(`Query: "${userQuestion.substring(0, 50)}${userQuestion.length > 50 ? '...' : ''}"`);

    // Generate embedding for user query
    const queryEmbedding = await embeddings.embedQuery(userQuestion);

    // Get Pinecone index
    const index = pc.index(PINECONE_CONFIG.indexName);

    // Define all namespaces to search
    const namespaces = [
      '', // default namespace (pharmacopoeia)
      'skin-diseases',
      'skin-diseases-tables',
      'mental-disorders',
      'mental-disorders-tables',
    ];

    logger.progress('Searching vector database...');

    // Search all namespaces in parallel
    const searchPromises = namespaces.map(async (ns) => {
      try {
        const nsQuery = index.namespace(ns);
        const response = await nsQuery.query({
          vector: queryEmbedding,
          topK: 5, // Get top 5 from each namespace
          includeValues: false,
          includeMetadata: true,
        });
        
        // Tag matches with namespace for debugging
        if (response.matches) {
          response.matches.forEach(match => {
            if (match.metadata) {
              (match.metadata as any).namespace = ns || 'default';
            }
          });
        }
        
        return response.matches || [];
      } catch (error) {
        return [];
      }
    });

    // Wait for all searches to complete
    const allMatches = (await Promise.all(searchPromises)).flat();

    // Sort all matches by score (highest first)
    allMatches.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Take top 10 overall results
    const topMatches = allMatches.slice(0, 10);

    // Log vector search results
    logger.logVectorSearch(namespaces, allMatches.length, topMatches);

    let filteredMatches: any[] = [];

    if (useHybridSearch) {
      logger.progress('Applying hybrid reranking...');
      
      // HYBRID RAG APPROACH EXPLANATION:
  // 1. VECTOR SEARCH (Pinecone): Semantic similarity using cosine distance on embeddings
  // 2. KEYWORD SEARCH (Local BM25 with IDF): Full BM25 algorithm with:
  //    - TF (Term Frequency): How often terms appear in document
  //    - IDF (Inverse Document Frequency): Boosts rare terms, penalizes common terms
  //    - Length Normalization: Adjusts for document length differences
  // 3. HYBRID FUSION: Weighted combination of both scores for final ranking
  //
  // Why FULL BM25 with IDF matters:
  // - Common words like "the", "and", "for" get low IDF scores (ignored)
  // - Rare/specific terms like "turmeric", "ashwagandha" get high IDF scores (boosted)
  // - Better precision: focuses on meaningful keywords, not just any keyword match
  
  // Create documents with proper structure for LOCAL BM25 keyword matching
  // Note: BM25 is calculated locally, NOT by Pinecone - we extract content for analysis
      const documentsWithScores: [{ pageContent: string }, number][] = topMatches.map(match => {
        // Safely extract content from Pinecone metadata and ensure it's a string
        const rawContent = match.metadata?.content || match.metadata?.text || '';
        const content = typeof rawContent === 'string' ? rawContent : String(rawContent);
        
        return [
          { pageContent: content }, // This content will be analyzed by FULL BM25 algorithm (TF + IDF)
          match.score || 0          // Original Pinecone vector similarity score (cosine)
        ];
      });
  
      // Rerank using hybrid approach: Pinecone semantic + Full BM25 (with IDF)
      // HybridSearch.rerank() now uses FULL BM25 algorithm with IDF weighting
      const { reranked: rerankedResults, idfScores, debugInfo } = HybridSearch.rerank(
        userQuestion, 
        documentsWithScores, 
        0.7 // 70% Pinecone vector + 30% Full BM25 (with IDF)
      );
      
      // Log BM25 analysis with IDF scoring and debug trace
      // IDF (Inverse Document Frequency) automatically weights terms by rarity:
      // - High IDF: Rare/specific terms (e.g., "cure", "eczema", "turmeric") → boosted significance
      // - Low IDF: Common words (e.g., "how", "do", "i", "the", "and") → minimal impact
      // This ensures BM25 focuses on medically relevant keywords rather than filler words
      const allDocTexts = documentsWithScores.map(([d]) => d.pageContent);
      logger.logBM25Analysis(userQuestion, allDocTexts, idfScores, debugInfo);
      
      // Log hybrid reranking results
      logger.logHybridReranking(0.7, rerankedResults, topMatches);

      // Filter results by relevance threshold (now using hybrid scores)
      const relevanceThreshold = 0.35;
      filteredMatches = rerankedResults
        .map(([doc, hybridScore], index) => ({
          ...topMatches[documentsWithScores.findIndex(([d]) => d.pageContent === doc.pageContent)],
          score: hybridScore
        }))
        .filter(match => (match.score || 0) >= relevanceThreshold) || [];

      if (filteredMatches.length === 0 && rerankedResults.length > 0) {
        filteredMatches.push(
          ...rerankedResults.slice(0, 5).map(([doc, hybridScore], index) => ({
            ...topMatches[documentsWithScores.findIndex(([d]) => d.pageContent === doc.pageContent)],
            score: hybridScore
          }))
        );
      }
      
      logger.logFilteredDocuments(filteredMatches, relevanceThreshold, true);
    } else {
      // Use top matches from Pinecone directly
      const vectorThreshold = 0.40;
      
      filteredMatches = topMatches.filter(match => (match.score || 0) >= vectorThreshold);
      
      if (filteredMatches.length === 0 && topMatches.length > 0) {
        filteredMatches = topMatches.slice(0, 5);
      }
      
      logger.logFilteredDocuments(filteredMatches, vectorThreshold, false);
    }

    // Convert Pinecone matches to LangChain Documents
    const relevantDocs = filteredMatches.map(match => {
      const metadata = match.metadata as any;
      
      // Handle different metadata structures (original vs table data)
      const pageContent = metadata.content || metadata.text || '';
      const namespace = metadata.namespace || 'default';
      
      // Construct source document based on namespace
      let sourceDocument = 'Ayurvedic Pharmacopoeia Volume 1';
      if (namespace.includes('skin-diseases')) {
        sourceDocument = 'Ayurveda Guidelines for Skin Diseases';
      } else if (namespace.includes('mental-disorders')) {
        sourceDocument = 'Ayurveda Guidelines for Mental Health';
      }
      
      // Extract clean metadata
      const cleanMetadata: AyurvedaMetadata = {
        source_document: sourceDocument,
        page_number: metadata.page || metadata.page_number,
        herb_name: metadata.herb_name,
        botanical_name: metadata.botanical_name,
        dosha_type: metadata.dosha_type,
        category: metadata.category || (metadata.type === 'table' ? 'clinical-table' as any : 'pharmacopoeia'),
        document_id: match.id,
      };
      
      return new Document<AyurvedaMetadata>({
        pageContent,
        metadata: cleanMetadata,
      });
    });

    // Helper function to format documents with citation metadata
    const formatDocsWithCitations = (docs: Document<AyurvedaMetadata>[]) => {
      return docs.map((doc, index) => {
        const metadata = doc.metadata;
        const sourceDoc = metadata.source_document || 'Ayurvedic Source';
        const pageNumber = metadata.page_number || 'N/A';
        const herbName = metadata.herb_name || 'Clinical Information';
        const botanicalName = metadata.botanical_name ? ` (${metadata.botanical_name})` : '';
        const doshaType = metadata.dosha_type ? ` [${metadata.dosha_type} balancing]` : '';
        const category = metadata.category || 'general';
        
        // Format citation based on source document type
        let citationInfo = '';
        if (sourceDoc.includes('Pharmacopoeia')) {
          citationInfo = `【Ayurvedic Pharmacopoeia Vol-1†${herbName}†Page ${pageNumber}】`;
        } else if (sourceDoc.includes('Skin Diseases')) {
          citationInfo = `【Ayurveda Guidelines for Skin Diseases†Page ${pageNumber}】`;
        } else if (sourceDoc.includes('Mental Health')) {
          citationInfo = `【Ayurveda Guidelines for Mental Health†Page ${pageNumber}】`;
        } else {
          citationInfo = `【${sourceDoc}†Page ${pageNumber}】`;
        }
        
        return `
--- Document ${index + 1} ---
Citation Info: ${citationInfo}
Source: ${sourceDoc}${herbName !== 'Clinical Information' ? `\nHerb: ${herbName}${botanicalName}${doshaType}` : ''}
Category: ${category}
Content:
${doc.pageContent}
---
`;
      }).join('\n');
    };

    // Initialize OpenAI chat model for response generation
    const chatModel = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.3,
      streaming: true,
      verbose: false,
      callbacks: [],
    });
    
    logger.logLLMGeneration('gpt-4o-mini', 0.3, relevantDocs.length);
    logger.progress('Generating response...');

    // Create the RAG chain using RunnableSequence
    const ragChain = RunnableSequence.from([
      {
        context: () => formatDocsWithCitations(relevantDocs),
        question: (input: { question: string }) => input.question,
      },
      ragPromptTemplate,
      chatModel,
      new HttpResponseOutputParser(),
    ]);

    // Execute the chain and stream the response
    const stream = await ragChain.stream({
      question: userQuestion,
    });

    // Save query log
    const sourceNamespaces = relevantDocs.map(d => 
      (d.metadata as any).source_document || 'Unknown'
    );
    const uniqueNamespaces = Array.from(new Set(sourceNamespaces));
    
    await logger.saveLog(
      relevantDocs.length,
      uniqueNamespaces,
      useHybridSearch
    );
    
    logger.complete(`Query processed (${relevantDocs.length} docs, ${uniqueNamespaces.length} sources)`);

    // Return streaming response
    return new StreamingTextResponse(
      stream.pipeThrough(createStreamDataTransformer()),
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Vector-DB': 'Pinecone',
          'X-Search-Method': useHybridSearch ? 'Vector + BM25 Hybrid' : 'Vector Only',
          'X-Documents-Found': relevantDocs.length.toString(),
          'X-Index-Name': PINECONE_CONFIG.indexName,
        },
      }
    );

  } catch (error) {
    if (logger) {
      logger.error('Query processing failed');
      await logger.saveLog(0, [], false, error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Handle specific Pinecone errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json({
          error: 'Pinecone API key is missing or invalid',
          details: 'Please set PINECONE_API_KEY in your environment variables',
        }, { status: 401 });
      }
      
      if (error.message.includes('Index not found')) {
        return NextResponse.json({
          error: 'Pinecone index not found',
          details: `Index '${PINECONE_CONFIG.indexName}' does not exist. Please create it in Pinecone console.`,
        }, { status: 404 });
      }
    }

    return NextResponse.json({
      error: 'Internal server error in Pinecone RAG processing',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET(req: NextRequest) {
  try {
    const index = pc.index(PINECONE_CONFIG.indexName);
    const stats = await index.describeIndexStats();
    
    return NextResponse.json({
      status: 'healthy',
      vectorDatabase: 'Pinecone',
      indexName: PINECONE_CONFIG.indexName,
      vectorCount: stats.totalRecordCount || 0,
      dimension: PINECONE_CONFIG.dimension,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      indexName: PINECONE_CONFIG.indexName,
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}