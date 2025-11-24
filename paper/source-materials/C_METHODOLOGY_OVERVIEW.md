# C. Methodology Overview

## Methodology Steps
1.  **Document Processing**: MinerU extracts structured content from PDF preserving medical terminology.
2.  **Vector Embeddings**: OpenAI `text-embedding-3-small` creates 1536-dimensional semantic vectors.
3.  **Pinecone Vector DB**: Stores 409 document chunks with Ayurveda-specific metadata in the cloud.
4.  **Semantic Search**: Finds top-5 most relevant documents from 3 namespaces of Pinecone using cosine similarity (threshold: 0.7).
5.  **LLM Generation**: GPT-4o-mini generates contextual answers with source citations.

## System Architecture Deep Dive
The system follows a **Three-Tier Architecture with Vector Database Layer**:

### 1. Frontend Layer (React/Next.js)
*   Chat interface with streaming support.
*   Vercel AI SDK for state management.
*   Edge runtime for global distribution.

### 2. API Layer (Next.js Serverless Functions)
*   `/api/embedpinecone` route handler.
*   Request validation and error handling.
*   LangChain RAG chain orchestration.

### 3. Backend Services
*   **OpenAI API**: `text-embedding-3-small` (1536-d).
*   **Pinecone Vector DB**: 1536-d vectors, Cosine similarity, ~220 chunks.

```mermaid
flowchart TB
    subgraph Offline["📦 Offline Processing"]
        A[PDF Document<br/>241 pages] --> B[MinerU Parser<br/>Extract Structure]
        B --> C[409 Text Chunks<br/>with Metadata]
        C --> D[OpenAI Embeddings<br/>1536 dimensions]
        D --> E[Pinecone Upload<br/>3 batches]
    end
    
    subgraph Online["⚡ Real-Time Query"]
        F[User Question] --> G[Query Embedding]
        G --> H[Pinecone Search<br/>Top-5 Results]
        H --> I[Context + Question]
        I --> J[GPT-4o-mini<br/>Streaming Response]
    end
    
    E --> H
    
    style E fill:#2E7D32,stroke:#1b5e20,color:#fff
    style H fill:#2E7D32,stroke:#1b5e20,color:#fff
    style J fill:#9C27B0,stroke:#6a1b7a,color:#fff
```
