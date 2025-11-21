# Ayurvedic Embedding Route Design: `/api/embedyurveda`

## Overview

This document outlines the design and implementation of a new API route `/api/embedyurveda` that leverages LangChain's vector database capabilities to provide semantic search and retrieval for Ayurvedic knowledge. Unlike the existing `/api/ayurveda` route that uses keyword-based search, this new route will use embeddings for more sophisticated semantic understanding.

## Current State Analysis

### Existing `/api/ayurveda` Route
- **Search Method**: Keyword-based scoring with regex matching
- **Data Source**: `ayurcheck_rag.json` (220 chunks from 183 pages)
- **Search Algorithm**: 
  - Word frequency matching
  - Title/section boosting (+10 for titles, +5 for sections)
  - Simple relevance scoring
- **Limitations**: 
  - No semantic understanding
  - Misses conceptually related content
  - Limited by exact keyword matches

### Proposed Enhancement
The new route will use vector embeddings to understand semantic relationships, enabling more intelligent retrieval of Ayurvedic knowledge.

## Architecture Design - Basic Version

### 1. Core Components (Simplified)

#### A. Basic Embedding Configuration
```typescript
interface BasicEmbeddingConfig {
  model: 'text-embedding-ada-002';    // OpenAI embeddings only
  vectorStore: 'memory';              // In-memory only for basic version
}
```

#### B. Simplified Document Structure
```typescript
interface AyurvedicDocument extends Document {
  pageContent: string;     // Chunk text content
  metadata: {
    id: string;           // Original chunk ID
    page: number;         // Source page number
    type: string;         // text, title, table, formula
    section?: string;     // Section hierarchy
    subsection?: string;  // Subsection hierarchy
  };
}
```

### 2. Basic Implementation Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   JSON Chunks   │───▶│  Document        │───▶│  Memory Vector  │
│  (ayurcheck     │    │  Transformation  │    │  Store          │
│   _rag.json)    │    │  (Simple)        │    │  (Runtime Only) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Query    │───▶│  Basic Semantic  │───▶│  Standard       │
│                 │    │  Search          │    │  LangChain      │
│                 │    │  (Similarity)    │    │  RAG Chain      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 3. Why In-Memory is Perfect for Basic Version

**Advantages:**
- ✅ **No External Dependencies**: No ChromaDB or Pinecone setup required
- ✅ **Fast Development**: Follows existing tutorial pattern
- ✅ **Simple Deployment**: Works immediately without infrastructure
- ✅ **Perfect for Learning**: Demonstrates core embedding concepts
- ✅ **Low Latency**: No disk I/O or network calls

**Acceptable Limitations:**
- ⚠️ **Non-Persistent**: Rebuilds embeddings on each restart (~2-3 seconds for 220 chunks)
- ⚠️ **Memory Usage**: ~10MB for embeddings (well within limits)
- ⚠️ **Single Instance**: No scaling (fine for tutorial/demo)

**Perfect for This Use Case:**
- 220 chunks = manageable size
- Educational/demo purpose
- Quick iteration and testing
- Easy comparison with existing `/api/ayurveda`

## Step-by-Step Implementation Plan

### Phase 1: Vector Store Setup

#### Step 1.1: Dependencies Installation (Basic Version)
```bash
# Only essential packages for basic embedding functionality
npm install @langchain/openai langchain
# Note: MemoryVectorStore is included in 'langchain' package
```

#### Step 1.2: Basic Document Transformation Service
```typescript
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
```

#### Step 1.3: Basic Vector Store Initialization
```typescript
class BasicAyurvedicVectorStore {
  private vectorStore: MemoryVectorStore;
  private embeddings: OpenAIEmbeddings;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: 'text-embedding-ada-002',
    });
  }

  /**
   * Initialize memory vector store (simple)
   */
  async initialize(): Promise<void> {
    const { MemoryVectorStore } = await import('langchain/vectorstores/memory');
    this.vectorStore = new MemoryVectorStore(this.embeddings);
    console.log('✅ Memory vector store initialized');
  }

  /**
   * Add documents to vector store
   */
  async addDocuments(documents: AyurvedicDocument[]): Promise<void> {
    console.log(`📚 Adding ${documents.length} documents to memory vector store...`);
    await this.vectorStore.addDocuments(documents);
    console.log(`✅ Added all documents to vector store`);
  }

  /**
   * Basic semantic similarity search
   */
  async semanticSearch(query: string, k: number = 5): Promise<AyurvedicDocument[]> {
    return await this.vectorStore.similaritySearch(query, k) as AyurvedicDocument[];
  }

  /**
   * Get retriever for LangChain integration
   */
  asRetriever(k: number = 5) {
    return this.vectorStore.asRetriever({ k });
  }
}
```

### Phase 2: Basic RAG Chain

#### Step 2.1: Simple Embedding RAG Chain
```typescript
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
  createEmbeddingRAGChain(): RunnableSequence {
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
        question: (input: { question: string }) => input.question,
        chat_history: (input: { chat_history: string }) => input.chat_history,
        context: retriever.pipe(formatDocumentsAsString),
      },
      prompt,
      this.llm,
      new HttpResponseOutputParser(),
    ]);
  }
}
```

### Phase 3: API Route Implementation

#### Step 3.1: Route Structure (`/src/app/api/embedyurveda/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { StreamingTextResponse, createStreamDataTransformer } from 'ai';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { formatDocumentsAsString } from 'langchain/util/document';
import { HttpResponseOutputParser } from 'langchain/output_parsers';
import fs from 'fs';
import path from 'path';
// Import our basic classes (these will be defined in the same file or separate service files)

export const dynamic = 'force-dynamic';

// Global instances
let embeddingRAG: AyurvedicEmbeddingRAG | null = null;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize the embedding-based RAG system
 */
async function initializeEmbeddingRAG(): Promise<AyurvedicEmbeddingRAG> {
  if (embeddingRAG) return embeddingRAG;

  if (!initializationPromise) {
    initializationPromise = (async () => {
      console.log('🚀 Initializing Ayurvedic Embedding RAG...');
      
      try {
        // Load and transform documents
        const ragPath = path.join(process.cwd(), 'src', 'data', 'ayurcheck_rag.json');
        const ragData = JSON.parse(fs.readFileSync(ragPath, 'utf-8'));
        const documents = AyurvedicDocumentProcessor.transformChunksToDocuments(ragData);

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
 * Health check endpoint
 */
export async function GET() {
  try {
    const rag = await initializeEmbeddingRAG();
    
    return NextResponse.json({
      status: 'healthy',
      vectorStore: 'memory',
      message: 'Ayurvedic Embedding RAG system is running'
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}
```

### Phase 4: Enhanced UI Integration

#### Step 4.1: Updated Chat Component
```typescript
// src/app/components/ayurvedic-embedding-chat.tsx
export default function AyurvedicEmbeddingChat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/embedyurveda',
    initialMessages: [{
      id: 'welcome',
      role: 'assistant',
      content: `🧠 **Welcome to Advanced Ayurvedic Knowledge Assistant**

I use semantic understanding and vector embeddings to provide more intelligent responses about Ayurvedic medicine. This advanced system can:

• **Understand Context**: Find conceptually related information, not just keyword matches
• **Cross-Reference**: Connect related herbs, treatments, and conditions
• **Deep Search**: Discover hidden connections in the Ayurvedic Pharmacopoeia
• **Contextual Memory**: Build on our conversation for better recommendations

*Enhanced with vector embeddings for superior knowledge retrieval*

What Ayurvedic topic would you like to explore?`
    }]
  });

  // Enhanced suggestions with semantic understanding
  const suggestions = [
    "Find herbs similar to Ashwagandha for stress",
    "Compare different Guggulu preparations",
    "Herbs for Pitta-related disorders",
    "Rasayana formulations for longevity",
    "Anti-inflammatory Ayurvedic medicines"
  ];

  // Rest of component implementation...
}
```

## Performance Considerations

### 1. Vector Store Options

| Option | Pros | Cons | Use Case |
|--------|------|------|----------|
| **HNSWLib** | Fast, local, persistent | Memory intensive | Development, small-scale |
| **ChromaDB** | Scalable, full-featured | Requires server | Production |
| **Pinecone** | Cloud-native, managed | Cost, external dependency | Enterprise |
| **Memory** | Simple, fast | Non-persistent | Testing |

### 2. Optimization Strategies

#### Caching Strategy
```typescript
class EmbeddingCache {
  private cache = new Map<string, CachedResult>();
  
  async getCachedSearch(query: string): Promise<CachedResult | null> {
    const key = this.hashQuery(query);
    const cached = this.cache.get(key);
    
    if (cached && !this.isExpired(cached)) {
      return cached;
    }
    
    return null;
  }
}
```

#### Lazy Loading
```typescript
// Load embeddings on-demand
const documents = await this.loadDocumentsBatch(pageNumbers);
```

### 3. Monitoring and Analytics

```typescript
interface SearchMetrics {
  query: string;
  resultsCount: number;
  searchTime: number;
  relevanceScore: number;
  userSatisfaction?: boolean;
}

class RAGAnalytics {
  async trackSearch(metrics: SearchMetrics): Promise<void> {
    // Log to analytics service
    console.log('📊 Search Analytics:', metrics);
  }
}
```

## Testing Strategy

### 1. Unit Tests
- Document transformation
- Vector store operations
- Similarity search accuracy
- Prompt template rendering

### 2. Integration Tests
- End-to-end API flow
- Vector store persistence
- Error handling scenarios

### 3. Evaluation Metrics
- **Retrieval Accuracy**: Relevant chunks retrieved vs. total
- **Response Quality**: Human evaluation of answer relevance
- **Latency**: Time from query to first token
- **Semantic Similarity**: Cosine similarity between query and results

## Migration Path

### Phase 1: Parallel Deployment
- Deploy `/api/embedyurveda` alongside existing `/api/ayurveda`
- A/B test with different user groups
- Compare performance metrics

### Phase 2: Gradual Migration
- Route percentage of traffic to new endpoint
- Monitor error rates and user satisfaction
- Collect feedback on answer quality

### Phase 3: Full Migration
- Switch default endpoint in UI
- Deprecate old keyword-based search
- Maintain backward compatibility

## Future Enhancements

### 1. Multi-Modal Embeddings
- Include image embeddings for plant identification
- Table and formula-specific embeddings

### 2. Fine-Tuned Models
- Custom embeddings trained on Ayurvedic corpus
- Domain-specific language models

### 3. Real-Time Updates
- Streaming document updates
- Incremental index building

### 4. Advanced Features
- Query auto-completion
- Related topic suggestions
- Personalized recommendations

## Conclusion

The embedding-based Ayurvedic route will significantly enhance the semantic understanding and retrieval capabilities of the knowledge system. By leveraging vector embeddings, we can provide more accurate, contextual, and comprehensive responses to Ayurvedic queries while maintaining the existing JSON chunk structure and building upon the proven architecture.

The implementation provides a clear migration path from keyword-based to semantic search, with comprehensive monitoring and optimization strategies for production deployment.