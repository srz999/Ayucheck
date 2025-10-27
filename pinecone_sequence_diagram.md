# Pinecone Low-Level Sequence Diagram

## Overview
This document provides detailed Mermaid sequence diagrams showing the exact flow when a user opens the `/embeddingpinecone` page and submits queries.

## 1. Page Load & Initialization Sequence

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant NextJS as Next.js App
    participant PineconeChat as AyurvedicPineconeChat
    participant HealthAPI as GET /api/embedpinecone
    participant PineconeCloud as Pinecone Cloud
    
    Note over User, PineconeCloud: Page Load & Health Check Flow
    
    User->>Browser: Navigate to /embeddingpinecone
    Browser->>NextJS: GET /embeddingpinecone
    
    NextJS->>NextJS: Load page.tsx (runtime: 'edge')
    NextJS->>PineconeChat: Render AyurvedicPineconeChat component
    
    Note over PineconeChat: Component initialization
    PineconeChat->>PineconeChat: useState (connectionStatus: 'checking')
    PineconeChat->>PineconeChat: useChat hook (api: '/api/embedpinecone')
    PineconeChat->>PineconeChat: useEffect: checkPineconeHealth()
    
    Note over PineconeChat, PineconeCloud: Health Check Sequence
    PineconeChat->>HealthAPI: fetch GET /api/embedpinecone
    Note right of HealthAPI: Headers: {'Accept': 'application/json'}
    
    HealthAPI->>HealthAPI: Load environment variables
    Note over HealthAPI: PINECONE_API_KEY<br/>PINECONE_INDEX_NAME
    
    HealthAPI->>PineconeCloud: new Pinecone({apiKey})
    PineconeCloud-->>HealthAPI: Pinecone client instance
    
    HealthAPI->>PineconeCloud: pc.index(indexName)
    PineconeCloud-->>HealthAPI: Index instance
    
    HealthAPI->>PineconeCloud: index.describeIndexStats()
    PineconeCloud-->>HealthAPI: IndexStatsDescription
    Note right of PineconeCloud: {<br/>  totalRecordCount: 0,<br/>  dimension: 1536,<br/>  indexFullness: 0<br/>}
    
    HealthAPI-->>PineconeChat: 200 OK + JSON response
    Note left of HealthAPI: {<br/>  status: 'healthy',<br/>  vectorDatabase: 'Pinecone',<br/>  indexName: 'ayurveda-knowledge',<br/>  vectorCount: 0,<br/>  dimension: 1536<br/>}
    
    PineconeChat->>PineconeChat: setPineconeInfo(data)
    PineconeChat->>PineconeChat: setConnectionStatus('connected')
    PineconeChat->>Browser: Re-render with green status
    Browser->>User: Display "✅ Pinecone Connected (0 vectors)"
```

## 2. First Query & Data Initialization Sequence

```mermaid
sequenceDiagram
    participant User
    participant PineconeChat as AyurvedicPineconeChat
    participant QueryAPI as POST /api/embedpinecone
    participant FileSystem as File System
    participant OpenAI as OpenAI API
    participant PineconeCloud as Pinecone Cloud
    participant LLM as GPT-4o-mini
    
    Note over User, LLM: First Query Processing (Data Loading)
    
    User->>PineconeChat: Type query: "What herbs help with Vata?"
    User->>PineconeChat: Click "🌲 Ask Pinecone" button
    
    PineconeChat->>QueryAPI: POST /api/embedpinecone
    Note right of PineconeChat: {<br/>  messages: [{<br/>    role: "user",<br/>    content: "What herbs help with Vata?"<br/>  }]<br/>}
    
    Note over QueryAPI, PineconeCloud: Initialization Phase (First Time Only)
    
    QueryAPI->>QueryAPI: Check isDataLoaded flag (false)
    QueryAPI->>QueryAPI: initializePineconeIndex()
    
    QueryAPI->>PineconeCloud: pc.index(indexName)
    PineconeCloud-->>QueryAPI: Index instance
    
    QueryAPI->>PineconeCloud: index.describeIndexStats()
    PineconeCloud-->>QueryAPI: {totalRecordCount: 0}
    Note over QueryAPI: Index is empty, need to load data
    
    QueryAPI->>FileSystem: fs.readFileSync('ayurcheck_rag.jsonl')
    FileSystem-->>QueryAPI: Raw JSONL content
    
    QueryAPI->>QueryAPI: Parse JSONL (220+ documents)
    Note over QueryAPI: Split by newlines<br/>JSON.parse each line<br/>Extract metadata
    
    QueryAPI->>QueryAPI: Create Document objects
    Note over QueryAPI: Enhanced metadata extraction:<br/>- herb_name from regex<br/>- botanical_name from parentheses<br/>- dosha_type from content<br/>- category classification
    
    loop For each batch (100 docs)
        QueryAPI->>OpenAI: embeddings.embedDocuments(texts[])
        Note right of OpenAI: Model: text-embedding-3-small<br/>Batch size: 512<br/>Dimensions: 1536
        OpenAI-->>QueryAPI: embedding vectors[1536]
        
        QueryAPI->>QueryAPI: createPineconeVectors()
        Note over QueryAPI: Format: {<br/>  id: "doc_0_uuid123",<br/>  values: [1536 floats],<br/>  metadata: {content, herb_name, ...}<br/>}
        
        QueryAPI->>PineconeCloud: index.upsert(vectorBatch)
        Note right of PineconeCloud: Batch size: 100 vectors<br/>wait for completion
        PineconeCloud-->>QueryAPI: Upsert successful
    end
    
    QueryAPI->>QueryAPI: setDataLoaded(true)
    
    Note over QueryAPI, LLM: Query Processing Phase
    
    QueryAPI->>QueryAPI: Extract userQuestion from messages
    QueryAPI->>OpenAI: embeddings.embedQuery(userQuestion)
    Note right of OpenAI: Model: text-embedding-3-small<br/>Input: "What herbs help with Vata?"<br/>Output: [1536 query vector]
    OpenAI-->>QueryAPI: queryEmbedding[1536]
    
    QueryAPI->>PineconeCloud: index.query(searchParams)
    Note right of PineconeCloud: {<br/>  vector: queryEmbedding,<br/>  topK: 5,<br/>  includeValues: false,<br/>  includeMetadata: true<br/>}
    PineconeCloud-->>QueryAPI: searchResponse.matches[]
    Note left of PineconeCloud: [{<br/>  id: "doc_5_uuid456",<br/>  score: 0.87,<br/>  metadata: {<br/>    content: "Ashwagandha...",<br/>    herb_name: "Ashwagandha",<br/>    dosha_type: "vata"<br/>  }<br/>}]
    
    QueryAPI->>QueryAPI: filterByRelevance(threshold: 0.7)
    QueryAPI->>QueryAPI: convertToLangChainDocuments()
    
    QueryAPI->>QueryAPI: formatDocumentsAsString(context)
    QueryAPI->>QueryAPI: createRAGChain()
    
    QueryAPI->>LLM: ragChain.stream({question, context})
    Note right of LLM: Model: gpt-4o-mini<br/>Temperature: 0.3<br/>Stream: true<br/>Prompt: Ayurvedic expert template
    
    loop Stream response chunks
        LLM-->>QueryAPI: response chunk
        QueryAPI-->>PineconeChat: StreamingTextResponse chunk
        PineconeChat->>User: Display partial response
    end
    
    LLM-->>QueryAPI: stream complete
    QueryAPI-->>PineconeChat: Final headers
    Note left of QueryAPI: X-Vector-DB: Pinecone<br/>X-Documents-Found: 3<br/>X-Index-Name: ayurveda-knowledge
    
    PineconeChat->>User: Complete response with Pinecone attribution
```

## 3. Subsequent Query Sequence (Data Already Loaded)

```mermaid
sequenceDiagram
    participant User
    participant PineconeChat as AyurvedicPineconeChat
    participant QueryAPI as POST /api/embedpinecone
    participant OpenAI as OpenAI API
    participant PineconeCloud as Pinecone Cloud
    participant LLM as GPT-4o-mini
    
    Note over User, LLM: Subsequent Query Processing (Fast Path)
    
    User->>PineconeChat: Type: "Benefits of Ashwagandha"
    User->>PineconeChat: Submit query
    
    PineconeChat->>QueryAPI: POST /api/embedpinecone
    Note right of PineconeChat: {messages: [...]}
    
    QueryAPI->>QueryAPI: Check isDataLoaded flag (true)
    Note over QueryAPI: Skip initialization - data already loaded
    
    QueryAPI->>QueryAPI: Extract userQuestion
    QueryAPI->>OpenAI: embeddings.embedQuery("Benefits of Ashwagandha")
    OpenAI-->>QueryAPI: queryEmbedding[1536]
    
    QueryAPI->>PineconeCloud: index.query(searchParams)
    Note right of PineconeCloud: Fast vector search<br/>220+ vectors indexed<br/>Cosine similarity
    PineconeCloud-->>QueryAPI: Relevant matches (< 100ms)
    
    QueryAPI->>QueryAPI: Filter & format results
    QueryAPI->>LLM: Generate response with context
    
    loop Stream response
        LLM-->>QueryAPI: chunk
        QueryAPI-->>PineconeChat: chunk
        PineconeChat->>User: Real-time response
    end
    
    Note over User: Total time: ~2-3 seconds<br/>(vs 5-10 minutes first time)
```

## 4. Error Handling Flows

```mermaid
sequenceDiagram
    participant User
    participant PineconeChat as AyurvedicPineconeChat
    participant API as /api/embedpinecone
    participant PineconeCloud as Pinecone Cloud
    
    Note over User, PineconeCloud: Error Scenarios
    
    User->>PineconeChat: Open page
    PineconeChat->>API: Health check
    
    alt API Key Missing
        API->>API: Check process.env.PINECONE_API_KEY
        API-->>PineconeChat: 401 Unauthorized
        Note right of API: {error: "Pinecone API key missing"}
        PineconeChat->>PineconeChat: setConnectionStatus('disconnected')
        PineconeChat->>User: Show red warning banner
    
    else Index Not Found
        API->>PineconeCloud: Attempt connection
        PineconeCloud-->>API: 404 Index not found
        API-->>PineconeChat: 404 Error
        Note right of API: {error: "Index 'ayurveda-knowledge' not found"}
        PineconeChat->>User: Show error message with creation link
    
    else Rate Limiting
        API->>PineconeCloud: Too many requests
        PineconeCloud-->>API: 429 Rate limit exceeded
        API-->>PineconeChat: 429 Error
        PineconeChat->>User: Show rate limit warning
    
    else Network Issues
        API->>PineconeCloud: Connection timeout
        PineconeCloud-->>API: Network error
        API-->>PineconeChat: 503 Service unavailable
        PineconeChat->>User: Show connectivity error
    end
```

## Performance Metrics

| Phase | Operation | Time | Details |
|-------|-----------|------|---------|
| **Page Load** | Component render | ~100ms | Next.js SSG/SSR |
| **Health Check** | GET /api/embedpinecone | ~200-500ms | Network + Pinecone API |
| **First Query** | Data initialization | 5-10 min | JSONL parsing + embedding generation |
| **First Query** | Vector upload | 2-3 min | 220+ vectors to Pinecone (100/batch) |
| **First Query** | Query processing | ~2-3s | Embedding + search + LLM |
| **Subsequent** | Query processing | ~2-3s | Direct search (no initialization) |
| **Vector Search** | Pinecone similarity | ~50-200ms | 220+ vectors, cosine similarity |

## Configuration Summary

```typescript
// Environment Variables Required
PINECONE_API_KEY=pcsk_xxx...
PINECONE_INDEX_NAME=ayurveda-knowledge
OPENAI_API_KEY=sk-proj-xxx...

// Pinecone Index Specifications
{
  name: "ayurveda-knowledge",
  dimension: 1536,
  metric: "cosine",
  cloud: "aws",
  region: "us-east-1"
}

// Processing Configuration
{
  embeddingModel: "text-embedding-3-small",
  batchSize: 100, // vectors per Pinecone upload
  relevanceThreshold: 0.7,
  maxResults: 5,
  llmModel: "gpt-4o-mini"
}
```