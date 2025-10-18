import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document } from 'langchain/document';

/**
 * Vector Store Configuration
 */
export interface VectorStoreConfig {
  useChroma?: boolean;
  chromaUrl?: string;
  collectionName?: string;
  openAIApiKey: string;
  embeddingModel?: string;
}

/**
 * Unified Vector Store Service
 * Supports both Chroma DB and Memory Vector Store with automatic fallback
 */
export class VectorStoreService {
  private vectorStore?: MemoryVectorStore | Chroma;
  private embeddings: OpenAIEmbeddings;
  private config: VectorStoreConfig;

  constructor(config: VectorStoreConfig) {
    this.config = {
      useChroma: process.env.USE_CHROMA === 'true',
      chromaUrl: process.env.CHROMA_URL || 'http://localhost:8000',
      collectionName: process.env.CHROMA_COLLECTION || 'ayurveda-docs',
      embeddingModel: 'text-embedding-ada-002',
      ...config,
    };

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: this.config.openAIApiKey,
      modelName: this.config.embeddingModel,
      verbose: true,
    });
  }

  /**
   * Initialize vector store with fallback logic
   */
  async initialize(): Promise<void> {
    try {
      if (this.config.useChroma) {
        console.log('🔄 Attempting to connect to Chroma DB...');
        console.log(`   - URL: ${this.config.chromaUrl}`);
        console.log(`   - Collection: ${this.config.collectionName}`);
        
        this.vectorStore = new Chroma(this.embeddings, {
          url: this.config.chromaUrl,
          collectionName: this.config.collectionName,
        });

        // Test connection by attempting a simple operation
        await this.testChromaConnection();
        console.log('✅ Chroma DB connected successfully');
      } else {
        throw new Error('Chroma disabled via USE_CHROMA=false');
      }
    } catch (error) {
      console.log('⚠️  Chroma DB connection failed, falling back to Memory Vector Store');
      console.log(`   - Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      this.vectorStore = new MemoryVectorStore(this.embeddings);
      console.log('✅ Memory Vector Store initialized');
    }
  }

  /**
   * Test Chroma connection
   */
  private async testChromaConnection(): Promise<void> {
    if (!(this.vectorStore instanceof Chroma)) {
      throw new Error('Not a Chroma instance');
    }

    try {
      // Try to perform a simple operation to test the connection
      await this.vectorStore.similaritySearch('test', 1);
    } catch (error) {
      // If collection doesn't exist yet, that's okay - it will be created when we add documents
      if (error instanceof Error && error.message.includes('Collection') && error.message.includes('does not exist')) {
        console.log('   - Collection will be created when documents are added');
        return;
      }
      throw error;
    }
  }

  /**
   * Add documents to vector store
   */
  async addDocuments(documents: Document[]): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized. Call initialize() first.');
    }

    const storeType = this.vectorStore instanceof Chroma ? 'Chroma DB' : 'Memory Vector Store';
    console.log(`📚 Adding ${documents.length} documents to ${storeType}...`);
    
    const startTime = Date.now();
    await this.vectorStore.addDocuments(documents);
    const endTime = Date.now();
    
    console.log(`✅ Added all documents to ${storeType} in ${endTime - startTime}ms`);
    console.log(`🎯 Generated embeddings for ${documents.length} documents`);
  }

  /**
   * Semantic similarity search
   */
  async similaritySearch(query: string, k: number = 5): Promise<Document[]> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized. Call initialize() first.');
    }

    const storeType = this.vectorStore instanceof Chroma ? 'Chroma DB' : 'Memory Vector Store';
    console.log(`🔍 Searching in ${storeType} for: "${query}"`);
    
    const startTime = Date.now();
    const results = await this.vectorStore.similaritySearch(query, k);
    const endTime = Date.now();
    
    console.log(`📊 Found ${results.length} results in ${endTime - startTime}ms`);
    return results;
  }

  /**
   * Similarity search with scores
   */
  async similaritySearchWithScore(query: string, k: number = 5): Promise<[Document, number][]> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized. Call initialize() first.');
    }

    const storeType = this.vectorStore instanceof Chroma ? 'Chroma DB' : 'Memory Vector Store';
    console.log(`🔍 Searching with scores in ${storeType} for: "${query}"`);
    
    const startTime = Date.now();
    const results = await this.vectorStore.similaritySearchWithScore(query, k);
    const endTime = Date.now();
    
    console.log(`📊 Found ${results.length} results with scores in ${endTime - startTime}ms`);
    return results;
  }

  /**
   * Get vector store type info
   */
  getStoreInfo(): { type: 'chroma' | 'memory'; url?: string; collection?: string } {
    if (this.vectorStore instanceof Chroma) {
      return {
        type: 'chroma',
        url: this.config.chromaUrl,
        collection: this.config.collectionName,
      };
    }
    return { type: 'memory' };
  }

  /**
   * Check if vector store is ready
   */
  isReady(): boolean {
    return this.vectorStore !== undefined;
  }
}

/**
 * Factory function for creating vector store service
 */
export function createVectorStoreService(openAIApiKey: string): VectorStoreService {
  return new VectorStoreService({ openAIApiKey });
}

/**
 * Legacy compatibility wrapper for existing code
 */
export class BasicAyurvedicVectorStore extends VectorStoreService {
  constructor() {
    super({
      openAIApiKey: process.env.OPENAI_API_KEY!,
    });
  }

  /**
   * Legacy method name compatibility
   */
  async semanticSearch(query: string, k: number = 5): Promise<any[]> {
    return this.similaritySearch(query, k);
  }
}