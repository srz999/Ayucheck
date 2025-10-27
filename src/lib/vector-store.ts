import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { v4 as uuidv4 } from 'uuid';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { Schemas } from '@qdrant/js-client-rest';
import { Pinecone } from '@pinecone-database/pinecone';

// Ayurveda-specific metadata interface
export interface AyurvedaMetadata {
  herb_name?: string;
  botanical_name?: string;
  condition?: string;
  dosha_type?: "vata" | "pitta" | "kapha" | "tridosha";
  category: "remedy" | "herb" | "lifestyle" | "diagnosis" | "pharmacopoeia";
  source_document: string;
  page_number?: number;
  benefits?: string;
  usage?: string;
  caution?: string;
  document_id: string;
}

// Chroma-compatible filter type
export interface ChromaFilter {
  [key: string]: string | number | boolean;
}

// Configuration interface
interface VectorStoreConfig {
  useVectorDB: boolean;
  vectorDBType: 'chroma' | 'memory' | 'qdrant' | 'pinecone';
  chromaUrl?: string;
  qdrantUrl?: string;
  qdrantApiKey?: string;
  pineconeApiKey?: string;
  pineconeIndexName?: string;
  collectionName?: string;
}

// Qdrant-specific interfaces
interface QdrantPoint {
  id: string;
  vector: number[];
  payload: Record<string, any>;
}

// Unified vector store interface
export interface IVectorStore {
  addDocuments(documents: Document<AyurvedaMetadata>[]): Promise<void>;
  similaritySearch(query: string, k?: number, filter?: Partial<AyurvedaMetadata>): Promise<Document<AyurvedaMetadata>[]>;
  similaritySearchWithScore(query: string, k?: number, filter?: Partial<AyurvedaMetadata>): Promise<[Document<AyurvedaMetadata>, number][]>;
  deleteCollection?(): Promise<void>;
  getCollectionInfo?(): Promise<{ count: number; name: string }>;
}

/**
 * Qdrant Vector Store Implementation
 */
class QdrantVectorStore implements IVectorStore {
  private client: QdrantClient;
  private embeddings: OpenAIEmbeddings;
  private collectionName: string;
  private initialized = false;

  constructor(config: { url: string; apiKey?: string; collectionName: string }, embeddings: OpenAIEmbeddings) {
    this.client = new QdrantClient({
      url: config.url,
      apiKey: config.apiKey,
    });
    this.embeddings = embeddings;
    this.collectionName = config.collectionName;
  }

  private async ensureCollection(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === this.collectionName);

      if (!exists) {
        console.log(`🔧 Creating Qdrant collection: ${this.collectionName}`);
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 1536, // OpenAI text-embedding-3-small dimension
            distance: 'Cosine',
          },
        });
        console.log(`✅ Created Qdrant collection: ${this.collectionName}`);
      } else {
        console.log(`✅ Qdrant collection already exists: ${this.collectionName}`);
      }

      this.initialized = true;
    } catch (error) {
      console.error('❌ Error creating Qdrant collection:', error);
      throw error;
    }
  }

  async addDocuments(documents: Document<AyurvedaMetadata>[]): Promise<void> {
    await this.ensureCollection();

    try {
      console.log(`📚 Adding ${documents.length} documents to Qdrant...`);
      
      // Generate embeddings for all documents
      const texts = documents.map(doc => doc.pageContent);
      const embeddings = await this.embeddings.embedDocuments(texts);

      // Convert documents to Qdrant points
      const points: QdrantPoint[] = documents.map((doc, i) => {
        const pointId = uuidv4(); // Always use UUID for Qdrant compatibility
        
        return {
          id: pointId,
          vector: embeddings[i],
          payload: {
            content: doc.pageContent,
            original_id: doc.metadata.document_id, // Store original ID in payload
            ...doc.metadata,
          },
        };
      });

      console.log(`📋 Generated ${points.length} points with UUIDs for Qdrant`);
      console.log(`📝 Sample point:`, JSON.stringify({
        id: points[0]?.id,
        idType: typeof points[0]?.id,
        vectorLength: points[0]?.vector?.length,
        payloadKeys: Object.keys(points[0]?.payload || {})
      }, null, 2));

      // Test with a single point first to debug the issue
      if (points.length > 0) {
        console.log(`🧪 Testing single point upload first...`);
        try {
          await this.client.upsert(this.collectionName, {
            wait: true,
            points: [points[0]], // Test with just the first point
          });
          console.log(`✅ Single point test successful!`);
        } catch (error) {
          console.error(`❌ Single point test failed:`, error);
          console.log(`🔍 Failed point details:`, JSON.stringify(points[0], null, 2));
          throw error;
        }
      }

      // Batch upload points (Qdrant supports batch operations)
      const batchSize = 10; // Very small batch size for debugging
      for (let i = 1; i < points.length; i += batchSize) { // Start from 1 since we already uploaded point 0
        const batch = points.slice(i, i + batchSize);
        console.log(`📤 Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil((points.length - 1) / batchSize)} with ${batch.length} points...`);
        
        try {
          await this.client.upsert(this.collectionName, {
            wait: true,
            points: batch,
          });
          console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} uploaded successfully`);
        } catch (error) {
          console.error(`❌ Error uploading batch ${Math.floor(i / batchSize) + 1}:`, error);
          // Log the problematic batch for debugging
          console.log(`🔍 Problematic batch points:`, batch.slice(0, 2).map(p => ({ 
            id: p.id, 
            idType: typeof p.id,
            vectorLength: p.vector?.length,
            payloadSize: JSON.stringify(p.payload).length 
          })));
          throw error;
        }
      }

      console.log(`✅ Added ${documents.length} documents to Qdrant`);
    } catch (error) {
      console.error('❌ Error adding documents to Qdrant:', error);
      throw error;
    }
  }

  async similaritySearch(
    query: string, 
    k: number = 5, 
    filter?: Partial<AyurvedaMetadata>
  ): Promise<Document<AyurvedaMetadata>[]> {
    await this.ensureCollection();

    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddings.embedQuery(query);

      // Build Qdrant filter
      let qdrantFilter: Schemas['Filter'] | undefined;
      if (filter) {
        qdrantFilter = this.buildQdrantFilter(filter);
      }

      // Perform search
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        limit: k,
        filter: qdrantFilter,
        with_payload: true,
      });

      // Convert results back to Documents
      const documents = searchResult.map(result => {
        const { content, ...metadata } = result.payload as any;
        return new Document<AyurvedaMetadata>({
          pageContent: content,
          metadata: metadata as AyurvedaMetadata,
        });
      });

      console.log(`🔍 Found ${documents.length} similar documents in Qdrant`);
      return documents;
    } catch (error) {
      console.error('❌ Error performing Qdrant similarity search:', error);
      throw error;
    }
  }

  async similaritySearchWithScore(
    query: string, 
    k: number = 5, 
    filter?: Partial<AyurvedaMetadata>
  ): Promise<[Document<AyurvedaMetadata>, number][]> {
    await this.ensureCollection();

    try {
      const queryEmbedding = await this.embeddings.embedQuery(query);

      let qdrantFilter: Schemas['Filter'] | undefined;
      if (filter) {
        qdrantFilter = this.buildQdrantFilter(filter);
      }

      const searchResult = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        limit: k,
        filter: qdrantFilter,
        with_payload: true,
      });

      const results: [Document<AyurvedaMetadata>, number][] = searchResult.map(result => {
        const { content, ...metadata } = result.payload as any;
        const document = new Document<AyurvedaMetadata>({
          pageContent: content,
          metadata: metadata as AyurvedaMetadata,
        });
        return [document, result.score || 0];
      });

      console.log(`🔍 Found ${results.length} similar documents with scores in Qdrant`);
      return results;
    } catch (error) {
      console.error('❌ Error performing Qdrant similarity search with scores:', error);
      throw error;
    }
  }

  private buildQdrantFilter(filter: Partial<AyurvedaMetadata>): Schemas['Filter'] {
    const must: Schemas['Condition'][] = [];

    Object.entries(filter).forEach(([key, value]) => {
      if (typeof value === 'string') {
        must.push({
          key,
          match: { value },
        });
      } else if (typeof value === 'number') {
        must.push({
          key,
          match: { value },
        });
      } else if (typeof value === 'boolean') {
        must.push({
          key,
          match: { value },
        });
      }
    });

    return { must };
  }

  async deleteCollection(): Promise<void> {
    try {
      await this.client.deleteCollection(this.collectionName);
      console.log(`🗑️ Deleted Qdrant collection: ${this.collectionName}`);
      this.initialized = false;
    } catch (error) {
      console.error('❌ Error deleting Qdrant collection:', error);
      throw error;
    }
  }

  async getCollectionInfo(): Promise<{ count: number; name: string }> {
    try {
      await this.ensureCollection();
      const info = await this.client.getCollection(this.collectionName);
      return {
        count: info.points_count || 0,
        name: this.collectionName,
      };
    } catch (error) {
      console.error('❌ Error getting Qdrant collection info:', error);
      throw error;
    }
  }
}

/**
 * Pinecone Vector Store Implementation
 */
class PineconeVectorStore implements IVectorStore {
  private client: Pinecone;
  private embeddings: OpenAIEmbeddings;
  private indexName: string;
  private initialized = false;

  constructor(config: { apiKey: string; indexName: string }, embeddings: OpenAIEmbeddings) {
    this.client = new Pinecone({
      apiKey: config.apiKey,
    });
    this.embeddings = embeddings;
    this.indexName = config.indexName;
  }

  private async ensureIndex(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if index exists - if this doesn't throw, index exists
      const index = this.client.index(this.indexName);
      await index.describeIndexStats();
      
      console.log(`✅ Pinecone index already exists: ${this.indexName}`);
      this.initialized = true;
    } catch (error) {
      console.error('❌ Error accessing Pinecone index:', error);
      throw new Error(`Pinecone index '${this.indexName}' not found. Please create it in Pinecone console.`);
    }
  }

  async addDocuments(documents: Document<AyurvedaMetadata>[]): Promise<void> {
    await this.ensureIndex();

    try {
      console.log(`📚 Adding ${documents.length} documents to Pinecone...`);
      
      // Generate embeddings for all documents
      const texts = documents.map(doc => doc.pageContent);
      const embeddings = await this.embeddings.embedDocuments(texts);

      // Convert documents to Pinecone vectors
      const vectors = documents.map((doc, i) => ({
        id: `doc_${i}_${uuidv4().slice(0, 8)}`,
        values: embeddings[i],
        metadata: {
          content: doc.pageContent,
          ...doc.metadata,
        },
      }));

      // Get index
      const index = this.client.index(this.indexName);

      // Batch upload vectors (Pinecone supports up to 1000 vectors per batch)
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        console.log(`📤 Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)} with ${batch.length} vectors...`);
        
        await index.upsert(batch);
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} uploaded successfully`);
      }

      console.log(`✅ Added ${documents.length} documents to Pinecone`);
    } catch (error) {
      console.error('❌ Error adding documents to Pinecone:', error);
      throw error;
    }
  }

  async similaritySearch(
    query: string, 
    k: number = 5, 
    filter?: Partial<AyurvedaMetadata>
  ): Promise<Document<AyurvedaMetadata>[]> {
    await this.ensureIndex();

    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddings.embedQuery(query);

      // Get index
      const index = this.client.index(this.indexName);

      // Build Pinecone filter
      let pineconeFilter: Record<string, any> | undefined;
      if (filter) {
        pineconeFilter = this.buildPineconeFilter(filter);
      }

      // Perform search
      const searchResult = await index.query({
        vector: queryEmbedding,
        topK: k,
        filter: pineconeFilter,
        includeValues: false,
        includeMetadata: true,
      });

      // Convert results back to Documents
      const documents = (searchResult.matches || []).map(match => {
        const { content, ...metadata } = match.metadata as any;
        return new Document<AyurvedaMetadata>({
          pageContent: content,
          metadata: metadata as AyurvedaMetadata,
        });
      });

      console.log(`🔍 Found ${documents.length} similar documents in Pinecone`);
      return documents;
    } catch (error) {
      console.error('❌ Error performing Pinecone similarity search:', error);
      throw error;
    }
  }

  async similaritySearchWithScore(
    query: string, 
    k: number = 5, 
    filter?: Partial<AyurvedaMetadata>
  ): Promise<[Document<AyurvedaMetadata>, number][]> {
    await this.ensureIndex();

    try {
      const queryEmbedding = await this.embeddings.embedQuery(query);
      const index = this.client.index(this.indexName);

      let pineconeFilter: Record<string, any> | undefined;
      if (filter) {
        pineconeFilter = this.buildPineconeFilter(filter);
      }

      const searchResult = await index.query({
        vector: queryEmbedding,
        topK: k,
        filter: pineconeFilter,
        includeValues: false,
        includeMetadata: true,
      });

      const results: [Document<AyurvedaMetadata>, number][] = (searchResult.matches || []).map(match => {
        const { content, ...metadata } = match.metadata as any;
        const document = new Document<AyurvedaMetadata>({
          pageContent: content,
          metadata: metadata as AyurvedaMetadata,
        });
        return [document, match.score || 0];
      });

      console.log(`🔍 Found ${results.length} similar documents with scores in Pinecone`);
      return results;
    } catch (error) {
      console.error('❌ Error performing Pinecone similarity search with scores:', error);
      throw error;
    }
  }

  private buildPineconeFilter(filter: Partial<AyurvedaMetadata>): Record<string, any> {
    const pineconeFilter: Record<string, any> = {};

    Object.entries(filter).forEach(([key, value]) => {
      if (typeof value === 'string') {
        pineconeFilter[key] = { $eq: value };
      } else if (typeof value === 'number') {
        pineconeFilter[key] = { $eq: value };
      } else if (typeof value === 'boolean') {
        pineconeFilter[key] = { $eq: value };
      }
    });

    return pineconeFilter;
  }

  async deleteCollection(): Promise<void> {
    try {
      // Note: Pinecone doesn't have a direct delete collection method
      // You would need to delete the index from Pinecone console
      console.log(`🗑️ Pinecone index deletion must be done through Pinecone console: ${this.indexName}`);
      this.initialized = false;
    } catch (error) {
      console.error('❌ Error with Pinecone index deletion:', error);
      throw error;
    }
  }

  async getCollectionInfo(): Promise<{ count: number; name: string }> {
    try {
      await this.ensureIndex();
      const index = this.client.index(this.indexName);
      const stats = await index.describeIndexStats();
      return {
        count: stats.totalRecordCount || 0,
        name: this.indexName,
      };
    } catch (error) {
      console.error('❌ Error getting Pinecone index info:', error);
      throw error;
    }
  }
}

export class VectorStoreService implements IVectorStore {
  private vectorStore!: Chroma | MemoryVectorStore | QdrantVectorStore | PineconeVectorStore;
  private embeddings: OpenAIEmbeddings;
  private config: VectorStoreConfig;
  private initialized = false;

  constructor(config: VectorStoreConfig) {
    this.config = config;
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "text-embedding-3-small", // Cost-effective model
      batchSize: 512, // Optimize batch processing
    });
  }

  private async initializeVectorStore(): Promise<void> {
    if (this.initialized) return;

    if (this.config.useVectorDB) {
      if (this.config.vectorDBType === 'pinecone') {
        try {
          this.vectorStore = new PineconeVectorStore({
            apiKey: this.config.pineconeApiKey || process.env.PINECONE_API_KEY!,
            indexName: this.config.pineconeIndexName || 'ayurveda-knowledge',
          }, this.embeddings);
          console.log('✅ Pinecone vector store initialized');
        } catch (error) {
          console.warn('⚠️ Pinecone not available, falling back to in-memory store:', error);
          this.vectorStore = new MemoryVectorStore(this.embeddings);
        }
      } else if (this.config.vectorDBType === 'qdrant') {
        try {
          this.vectorStore = new QdrantVectorStore({
            url: this.config.qdrantUrl || 'http://localhost:6333',
            apiKey: this.config.qdrantApiKey,
            collectionName: this.config.collectionName || 'ayurveda-knowledge',
          }, this.embeddings);
          console.log('✅ Qdrant vector store initialized');
        } catch (error) {
          console.warn('⚠️ Qdrant not available, falling back to in-memory store:', error);
          this.vectorStore = new MemoryVectorStore(this.embeddings);
        }
      } else if (this.config.vectorDBType === 'chroma') {
        try {
          this.vectorStore = new Chroma(this.embeddings, {
            url: this.config.chromaUrl || 'http://localhost:8000',
            collectionName: this.config.collectionName || 'ayurveda-knowledge',
          });
          console.log('✅ Chroma vector store initialized');
        } catch (error) {
          console.warn('⚠️ Chroma not available, falling back to in-memory store:', error);
          this.vectorStore = new MemoryVectorStore(this.embeddings);
        }
      } else {
        this.vectorStore = new MemoryVectorStore(this.embeddings);
        console.log('✅ In-memory vector store initialized');
      }
    } else {
      this.vectorStore = new MemoryVectorStore(this.embeddings);
      console.log('✅ In-memory vector store initialized');
    }
    
    this.initialized = true;
  }

  // Add documents to the vector store
  async addDocuments(documents: Document<AyurvedaMetadata>[]): Promise<void> {
    await this.initializeVectorStore();
    
    try {
      // Ensure each document has a unique ID
      const documentsWithIds = documents.map(doc => ({
        ...doc,
        metadata: {
          ...doc.metadata,
          document_id: doc.metadata.document_id || uuidv4(),
        }
      }));

      await this.vectorStore.addDocuments(documentsWithIds);
      console.log(`✅ Added ${documents.length} documents to vector store`);
    } catch (error) {
      console.error('❌ Error adding documents to vector store:', error);
      throw error;
    }
  }

  // Perform similarity search
  async similaritySearch(
    query: string, 
    k: number = 5, 
    filter?: Partial<AyurvedaMetadata>
  ): Promise<Document<AyurvedaMetadata>[]> {
    await this.initializeVectorStore();
    
    try {
      let results: any[];

      if (this.vectorStore instanceof PineconeVectorStore) {
        // Use Pinecone's native similarity search
        results = await this.vectorStore.similaritySearch(query, k, filter);
      } else if (this.vectorStore instanceof QdrantVectorStore) {
        // Use Qdrant's native similarity search
        results = await this.vectorStore.similaritySearch(query, k, filter);
      } else if (this.vectorStore instanceof Chroma && filter) {
        // Convert filter to Chroma-compatible format
        const chromaFilter = this.convertToChromaFilter(filter);
        results = await this.vectorStore.similaritySearch(query, k, chromaFilter);
      } else {
        // For memory store or when no filter is needed
        const allResults = await this.vectorStore.similaritySearch(query, k * 2); // Get more results for filtering
        
        // Manual filtering for in-memory store
        if (filter) {
          results = allResults.filter(doc => this.matchesFilter(doc.metadata as any, filter)).slice(0, k);
        } else {
          results = allResults.slice(0, k);
        }
      }

      console.log(`🔍 Found ${results.length} similar documents for query: "${query}"`);
      return results as Document<AyurvedaMetadata>[];
    } catch (error) {
      console.error('❌ Error performing similarity search:', error);
      throw error;
    }
  }

  // Perform similarity search with scores
  async similaritySearchWithScore(
    query: string, 
    k: number = 5, 
    filter?: Partial<AyurvedaMetadata>
  ): Promise<[Document<AyurvedaMetadata>, number][]> {
    await this.initializeVectorStore();
    
    try {
      let results: any[];

      if (this.vectorStore instanceof PineconeVectorStore) {
        // Use Pinecone's native similarity search with scores
        results = await this.vectorStore.similaritySearchWithScore(query, k, filter);
      } else if (this.vectorStore instanceof QdrantVectorStore) {
        // Use Qdrant's native similarity search with scores
        results = await this.vectorStore.similaritySearchWithScore(query, k, filter);
      } else if (this.vectorStore instanceof Chroma && filter) {
        const chromaFilter = this.convertToChromaFilter(filter);
        results = await this.vectorStore.similaritySearchWithScore(query, k, chromaFilter);
      } else {
        const allResults = await this.vectorStore.similaritySearchWithScore(query, k * 2);
        
        if (filter) {
          results = allResults
            .filter(([doc, _]) => this.matchesFilter(doc.metadata as any, filter))
            .slice(0, k);
        } else {
          results = allResults.slice(0, k);
        }
      }

      console.log(`🔍 Found ${results.length} similar documents with scores for query: "${query}"`);
      return results as [Document<AyurvedaMetadata>, number][];
    } catch (error) {
      console.error('❌ Error performing similarity search with scores:', error);
      throw error;
    }
  }

  // Convert filter to Chroma-compatible format
  private convertToChromaFilter(filter: Partial<AyurvedaMetadata>): ChromaFilter {
    const chromaFilter: ChromaFilter = {};
    
    Object.entries(filter).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        chromaFilter[key] = value;
      }
      // Skip array values as Chroma doesn't support them directly in filters
    });
    
    return chromaFilter;
  }

  // Helper method for manual filtering (used with in-memory store)
  private matchesFilter(metadata: any, filter: Partial<AyurvedaMetadata>): boolean {
    return Object.entries(filter).every(([key, value]) => {
      const metadataValue = metadata[key];
      
      if (typeof metadataValue === 'string' && typeof value === 'string') {
        return metadataValue.toLowerCase().includes(value.toLowerCase());
      }
      
      return metadataValue === value;
    });
  }

  // Delete collection
  async deleteCollection(): Promise<void> {
    await this.initializeVectorStore();
    
    if (this.vectorStore instanceof PineconeVectorStore) {
      await this.vectorStore.deleteCollection();
    } else if (this.vectorStore instanceof QdrantVectorStore) {
      await this.vectorStore.deleteCollection();
    } else if (this.vectorStore instanceof Chroma) {
      try {
        // Note: Chroma's delete method signature may vary, using a generic approach
        console.log('🗑️ Chroma collection deletion not implemented in this version');
        // await this.vectorStore.delete({ ids: [] }); // This would be the correct approach
      } catch (error) {
        console.error('❌ Error deleting collection:', error);
        throw error;
      }
    } else {
      console.log('🗑️ In-memory store cleared (automatic on restart)');
    }
  }

  // Get collection information
  async getCollectionInfo(): Promise<{ count: number; name: string }> {
    await this.initializeVectorStore();
    
    if (this.vectorStore instanceof PineconeVectorStore) {
      return await this.vectorStore.getCollectionInfo();
    } else if (this.vectorStore instanceof QdrantVectorStore) {
      return await this.vectorStore.getCollectionInfo();
    } else if (this.vectorStore instanceof Chroma) {
      try {
        // Note: Chroma doesn't have a direct count method, this is a placeholder
        return { 
          count: -1, // Would need to implement count logic
          name: this.config.collectionName || 'ayurveda-knowledge' 
        };
      } catch (error) {
        console.error('❌ Error getting collection info:', error);
        throw error;
      }
    } else {
      return { 
        count: -1, // MemoryVectorStore doesn't track count
        name: 'in-memory-store' 
      };
    }
  }
}

// Factory function to create vector store service
export function createVectorStoreService(): VectorStoreService {
  const config: VectorStoreConfig = {
    useVectorDB: process.env.USE_VECTOR_DB === 'true',
    vectorDBType: (process.env.VECTOR_DB_TYPE as 'chroma' | 'memory' | 'qdrant' | 'pinecone') || 'memory',
    chromaUrl: process.env.CHROMA_URL,
    qdrantUrl: process.env.QDRANT_URL,
    qdrantApiKey: process.env.QDRANT_API_KEY,
    pineconeApiKey: process.env.PINECONE_API_KEY,
    pineconeIndexName: process.env.PINECONE_INDEX_NAME,
    collectionName: process.env.QDRANT_COLLECTION || process.env.CHROMA_COLLECTION_NAME || process.env.PINECONE_INDEX_NAME || 'ayurveda-knowledge',
  };

  return new VectorStoreService(config);
}

// Export utility functions for feature flags
export const isSemanticSearchEnabled = () => process.env.ENABLE_SEMANTIC_SEARCH === 'true';
export const isMetadataFilteringEnabled = () => process.env.ENABLE_METADATA_FILTERING === 'true';
export const isHybridSearchEnabled = () => process.env.ENABLE_HYBRID_SEARCH === 'true';