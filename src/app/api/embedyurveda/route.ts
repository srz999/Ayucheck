import { NextRequest, NextResponse } from 'next/server';
import { StreamingTextResponse, createStreamDataTransformer } from 'ai';
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { formatDocumentsAsString } from 'langchain/util/document';
import { HttpResponseOutputParser } from 'langchain/output_parsers';
import { Document } from 'langchain/document';
import { createVectorStoreService, type AyurvedaMetadata } from '../../../lib/vector-store';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

export const dynamic = 'force-dynamic';

// For detailed LangChain logging, set these environment variables:
// LANGCHAIN_VERBOSE=true
// LANGCHAIN_TRACING_V2=true (for LangSmith tracing)
// DEBUG=langchain* (for debug-level logs)

// For OpenAI API call monitoring:
// DEBUG=openai* (for OpenAI SDK debug logs)
// OPENAI_LOG_LEVEL=debug (for detailed OpenAI API logs)

// HTTP Request Interceptor for OpenAI API calls
let originalHttpsRequest: any = null;
let originalHttpRequest: any = null;

function interceptOpenAIRequests() {
  if (originalHttpsRequest) return; // Already intercepted

  originalHttpsRequest = https.request;
  originalHttpRequest = http.request;

  const interceptRequest = (originalRequest: any, protocol: string) => {
    return function(this: any, options: any, callback?: any) {
      // Check if this is an OpenAI API call
      const isOpenAICall = options?.hostname?.includes('openai.com') || 
                          options?.host?.includes('openai.com') ||
                          (typeof options === 'string' && options.includes('openai.com'));

      if (isOpenAICall) {
        console.log(`🌐 Intercepted ${protocol.toUpperCase()} Request to OpenAI API:`);
        console.log(`   - URL: ${options?.hostname || options?.host}${options?.path || ''}`);
        console.log(`   - Method: ${options?.method || 'GET'}`);
        console.log(`   - Headers:`, JSON.stringify(options?.headers || {}, null, 2));
      }

      const req = originalRequest.call(this, options, callback);

      if (isOpenAICall) {
        const originalWrite = req.write;
        const originalEnd = req.end;
        let requestBody = '';

        req.write = function(chunk: any) {
          if (chunk) {
            requestBody += chunk.toString();
          }
          return originalWrite.call(this, chunk);
        };

        req.end = function(chunk: any) {
          if (chunk) {
            requestBody += chunk.toString();
          }
          
          if (requestBody) {
            try {
              const parsedBody = JSON.parse(requestBody);
              console.log(`📤 OpenAI Request Body:`, JSON.stringify(parsedBody, null, 2));
              
              // Log specific embedding request details
              if (parsedBody.input) {
                if (Array.isArray(parsedBody.input)) {
                  console.log(`   - Embedding ${parsedBody.input.length} items`);
                  console.log(`   - First item preview: ${parsedBody.input[0]?.substring(0, 100)}...`);
                } else {
                  console.log(`   - Single embedding: ${parsedBody.input.substring(0, 100)}...`);
                }
              }
            } catch (e) {
              console.log(`📤 OpenAI Request Body (raw):`, requestBody);
            }
          }
          
          return originalEnd.call(this, chunk);
        };
      }

      return req;
    };
  };

  https.request = interceptRequest(originalHttpsRequest, 'https');
  http.request = interceptRequest(originalHttpRequest, 'http');
}

// Define interfaces for existing data structure
interface RAGChunk {
  id: string;
  text: string;
  type: string;
  section?: string;
  subsection?: string;
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
}

interface AyurvedicDocument extends Document {
  pageContent: string;
  metadata: {
    id: string;
    page: number;
    type: string;
    section?: string;
    subsection?: string;
  };
}

/**
 * Basic Document Transformation Service
 */
class BasicAyurvedicDocumentProcessor {
  /**
   * Convert RAG chunks to LangChain Documents (Simplified)
   */
  static transformChunksToDocuments(ragData: RAGData): AyurvedicDocument[] {
    const documents: AyurvedicDocument[] = [];
    
    for (const pageKey in ragData.pages) {
      const page = ragData.pages[pageKey];
      
      for (const chunk of page.chunks) {
        const doc: AyurvedicDocument = {
          pageContent: chunk.text,
          metadata: {
            id: chunk.id,
            page: chunk.page || page.page_number,
            type: chunk.type,
            section: chunk.section,
            subsection: chunk.subsection,
          }
        };
        documents.push(doc);
      }
    }
    
    return documents;
  }
}

/**
 * Custom Embedding Wrapper with Deep API Call Logging
 */
class LoggingEmbeddings extends OpenAIEmbeddings {
  constructor(params: any) {
    super(params);
    
    // Enable HTTP request interceptor for development
    if (process.env.NODE_ENV === 'development') {
      interceptOpenAIRequests();
      
      // Set debug level for more detailed logs
      process.env.DEBUG = process.env.DEBUG ? `${process.env.DEBUG},openai*` : 'openai*';
    }
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    console.log(`🔧 OpenAI embedDocuments call - Processing ${texts.length} documents`);
    console.log(`📝 Sample text (first 100 chars): ${texts[0]?.substring(0, 100)}...`);
    
    // Log the actual API call parameters
    console.log(`🌐 API Call Details:`);
    console.log(`   - Model: ${this.modelName}`);
    console.log(`   - Input Count: ${texts.length} texts`);
    console.log(`   - Total Characters: ${texts.reduce((sum, text) => sum + text.length, 0)}`);
    console.log(`   - Batch Size: ${texts.length}`);
    
    const startTime = Date.now();
    
    try {
      const result = await super.embedDocuments(texts);
      const endTime = Date.now();
      
      console.log(`✅ OpenAI embedDocuments completed in ${endTime - startTime}ms`);
      console.log(`📊 Generated ${result.length} embeddings of dimension ${result[0]?.length || 0}`);
      
      // Log first embedding vector (first 10 numbers)
      if (result.length > 0 && result[0]) {
        const firstEmbedding = result[0].slice(0, 10).map(n => n.toFixed(6)).join(', ');
        console.log(`🔢 First embedding vector (first 10 values): [${firstEmbedding}, ...]`);
      }
      
      // Log API usage estimation
      const estimatedTokens = texts.reduce((sum, text) => sum + Math.ceil(text.length / 4), 0);
      console.log(`💰 Estimated API Usage: ~${estimatedTokens} tokens`);
      
      return result;
    } catch (error) {
      const endTime = Date.now();
      console.error(`❌ OpenAI embedDocuments failed after ${endTime - startTime}ms:`, error);
      throw error;
    }
  }

  async embedQuery(text: string): Promise<number[]> {
    console.log(`🔍 OpenAI embedQuery call - Processing query: "${text}"`);
    
    // Log the actual API call parameters
    console.log(`🌐 Query API Call Details:`);
    console.log(`   - Model: ${this.modelName}`);
    console.log(`   - Query Length: ${text.length} characters`);
    console.log(`   - Estimated Tokens: ~${Math.ceil(text.length / 4)}`);
    
    const startTime = Date.now();
    
    try {
      const result = await super.embedQuery(text);
      const endTime = Date.now();
      
      console.log(`✅ OpenAI embedQuery completed in ${endTime - startTime}ms`);
      console.log(`📊 Generated embedding of dimension ${result.length}`);
      
      // Log query embedding vector (first 10 numbers)
      if (result.length > 0) {
        const queryEmbedding = result.slice(0, 10).map(n => n.toFixed(6)).join(', ');
        console.log(`🔢 Query embedding vector (first 10 values): [${queryEmbedding}, ...]`);
      }
      
      return result;
    } catch (error) {
      const endTime = Date.now();
      console.error(`❌ OpenAI embedQuery failed after ${endTime - startTime}ms:`, error);
      throw error;
    }
  }
}

/**
 * Enhanced Vector Store Wrapper using new VectorStoreService
 */
class BasicAyurvedicVectorStore {
  private vectorStoreService: ReturnType<typeof createVectorStoreService>;
  private embeddings: LoggingEmbeddings;

  constructor() {
    this.embeddings = new LoggingEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: 'text-embedding-3-small', // Updated to more cost-effective model
      verbose: true, // Enable verbose logging for embedding calls
    });
    this.vectorStoreService = createVectorStoreService();
  }

  /**
   * Initialize vector store (Qdrant, Chroma, or Memory fallback)
   */
  async initialize(): Promise<void> {
    console.log('🔄 Initializing vector store service...');
    // The VectorStoreService handles initialization internally
    console.log('✅ Vector store service ready');
  }

  /**
   * Add documents to vector store
   */
  async addDocuments(documents: AyurvedicDocument[]): Promise<void> {
    console.log(`📚 Adding ${documents.length} documents to vector store...`);
    console.log(`🔧 This will generate embeddings for ${documents.length} documents using OpenAI API`);
    
    // Convert to the expected format
    const convertedDocs = documents.map(doc => ({
      pageContent: doc.pageContent,
      metadata: {
        ...doc.metadata,
        category: (doc.metadata.type === 'text' ? 'pharmacopoeia' : doc.metadata.type) as AyurvedaMetadata['category'],
        source_document: 'ayurcheck_rag.json',
        document_id: doc.metadata.id,
      } as AyurvedaMetadata
    }));
    
    const startTime = Date.now();
    await this.vectorStoreService.addDocuments(convertedDocs);
    const endTime = Date.now();
    
    console.log(`✅ Added all documents to vector store in ${endTime - startTime}ms`);
    console.log(`🎯 Generated embeddings for ${documents.length} documents`);
  }

  /**
   * Enhanced semantic similarity search
   */
  async semanticSearch(query: string, k: number = 5): Promise<AyurvedicDocument[]> {
    console.log(`🔍 Searching vector store for: "${query}"`);
    const startTime = Date.now();
    
    const results = await this.vectorStoreService.similaritySearch(query, k);
    
    // Convert back to AyurvedicDocument format
    const convertedResults = results.map(doc => ({
      pageContent: doc.pageContent,
      metadata: {
        id: doc.metadata.document_id,
        page: doc.metadata.page_number || 1,
        type: doc.metadata.category || 'text',
        section: doc.metadata.herb_name || doc.metadata.condition,
        subsection: doc.metadata.botanical_name,
      }
    })) as AyurvedicDocument[];
    
    const endTime = Date.now();
    console.log(`✅ Search completed in ${endTime - startTime}ms`);
    console.log(`📊 Found ${convertedResults.length} similar documents`);
    
    return convertedResults;
  }

  /**
   * Get retriever for LangChain integration
   */
  asRetriever(k: number = 5) {
    // Create a custom retriever that uses our vector store service
    return {
      invoke: async (query: string) => {
        const results = await this.vectorStoreService.similaritySearch(query, k);
        return results;
      }
    };
  }

  /**
   * Get vector store info for debugging
   */
  async getStoreInfo(): Promise<{ type: string; url?: string; collection?: string; count?: number }> {
    try {
      const info = await this.vectorStoreService.getCollectionInfo();
      const vectorDBType = process.env.VECTOR_DB_TYPE || 'memory';
      
      return {
        type: vectorDBType,
        url: process.env.QDRANT_URL || process.env.CHROMA_URL,
        collection: info.name,
        count: info.count,
      };
    } catch (error) {
      console.error('Error getting store info:', error);
      return {
        type: process.env.VECTOR_DB_TYPE || 'memory',
      };
    }
  }
}

/**
 * Basic Embedding RAG Chain
 */
class BasicAyurvedicEmbeddingRAG {
  private vectorStore: BasicAyurvedicVectorStore;
  private llm: ChatOpenAI;

  constructor() {
    this.vectorStore = new BasicAyurvedicVectorStore();
    this.llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-3.5-turbo',
      streaming: true,
      temperature: 0.3, // Lower temperature for medical accuracy
    });
  }

  /**
   * Initialize the RAG system
   */
  async initialize(): Promise<void> {
    await this.vectorStore.initialize();
  }

  /**
   * Add documents to the vector store
   */
  async addDocuments(documents: AyurvedicDocument[]): Promise<void> {
    await this.vectorStore.addDocuments(documents);
  }

  /**
   * Basic semantic search
   */
  async semanticSearch(query: string, k: number = 5): Promise<AyurvedicDocument[]> {
    return await this.vectorStore.semanticSearch(query, k);
  }

  /**
   * Create basic embedding RAG chain
   */
  createEmbeddingRAGChain(): RunnableSequence<any, any> {
    const retriever = this.vectorStore.asRetriever(5);



    const prompt = PromptTemplate.fromTemplate(`You are an expert in Ayurveda and traditional Indian medicine. You have access to the Ayurvedic Pharmacopoeia and should provide detailed, accurate information based on classical Ayurvedic texts.

CONVERSATION HISTORY:
{chat_history}

AYURVEDIC CONTEXT (Retrieved via Semantic Search):
{context}

CURRENT QUESTION: {question}

Instructions for your response:
1. Answer based primarily on the provided Ayurvedic context
2. Include relevant Sanskrit terms and their meanings where appropriate
3. Provide information about therapeutic properties, uses, dosage, and preparation methods when available
4. Mention page references or sections when citing specific information
5. If the context doesn't contain enough information, state this clearly and provide general Ayurvedic knowledge
6. Be comprehensive but practical in your recommendations
7. Always emphasize consulting with qualified Ayurvedic practitioners for medical advice

Please provide a detailed, helpful response about the Ayurvedic topic:`);

    return RunnableSequence.from([
      {
        question: (input: { question: string; chat_history: string }) => input.question,
        chat_history: (input: { question: string; chat_history: string }) => input.chat_history,
        context: (input: { question: string; chat_history: string }) => retriever.invoke(input.question).then(formatDocumentsAsString),
      },
      prompt,
      this.llm,
      new HttpResponseOutputParser(),
    ]);
  }
}

// Global instances
let embeddingRAG: BasicAyurvedicEmbeddingRAG | null = null;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize the embedding-based RAG system
 */
async function initializeEmbeddingRAG(): Promise<BasicAyurvedicEmbeddingRAG> {
  if (embeddingRAG) return embeddingRAG;

  if (!initializationPromise) {
    initializationPromise = (async () => {
      console.log('🚀 Initializing Ayurvedic Embedding RAG...');
      
      try {
        // Load and transform documents
        const ragPath = path.join(process.cwd(), 'src', 'data', 'ayurcheck_rag.json');
        const ragData = JSON.parse(fs.readFileSync(ragPath, 'utf-8'));
        const documents = BasicAyurvedicDocumentProcessor.transformChunksToDocuments(ragData);

        // Initialize RAG system
        embeddingRAG = new BasicAyurvedicEmbeddingRAG();
        await embeddingRAG.initialize();
        
        // Add documents (memory store is always empty on initialization)
        console.log('📚 Populating vector store with documents...');
        await embeddingRAG.addDocuments(documents);
        console.log(`✅ Vector store populated with ${documents.length} documents`);

        console.log('🎉 Ayurvedic Embedding RAG initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Embedding RAG:', error);
        throw error;
      }
    })();
  }

  await initializationPromise;
  return embeddingRAG!;
}

/**
 * POST endpoint for chat functionality
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request
    const { messages } = await req.json();
    
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    // Initialize RAG system
    const rag = await initializeEmbeddingRAG();
    
    // Extract current question and chat history
    const currentMessage = messages[messages.length - 1];
    const question = currentMessage.content;
    const chatHistory = messages
      .slice(0, -1)
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n');

    console.log(`🔍 Semantic search for: ${question}`);

    // Create and execute RAG chain
    const chain = rag.createEmbeddingRAGChain();
    const stream = await chain.stream({
      question,
      chat_history: chatHistory,
    });

    // Return streaming response
    return new StreamingTextResponse(
      stream.pipeThrough(createStreamDataTransformer())
    );

  } catch (error: any) {
    console.error('❌ Error in Embedding RAG:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 
      { status: error.status ?? 500 }
    );
  }
}

/**
 * GET endpoint for health check and store information
 */
export async function GET() {
  try {
    const rag = await initializeEmbeddingRAG();
    
    // Get detailed store information
    const storeInfo = await (rag as any).vectorStore.getStoreInfo();
    
    return NextResponse.json({
      status: 'healthy',
      vectorStore: storeInfo,
      message: 'Ayurvedic Embedding RAG system is running',
      features: {
        vectorDB: process.env.USE_VECTOR_DB === 'true',
        vectorDBType: process.env.VECTOR_DB_TYPE || 'memory',
        semanticSearch: true,
        metadataFiltering: true,
      }
    });
  } catch (error: any) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}