# High-Level UML Architecture Diagram for src/

## System Overview
This is a Next.js-based RAG (Retrieval-Augmented Generation) application for Ayurvedic medicine knowledge, featuring vector database integration with Qdrant, Chroma, and in-memory storage options.

## UML Class Diagram

```mermaid
classDiagram
    %% Presentation Layer (Next.js App Router)
    class App {
        +layout.tsx
        +page.tsx
        +globals.css
    }
    
    class Pages {
        +ayurveda/page.tsx
        +embedding/page.tsx
        +embeddingqdrant/page.tsx
    }
    
    %% UI Components Layer
    class UIComponents {
        +button.tsx
        +input.tsx
    }
    
    class ChatComponents {
        +chat.tsx
        +ayurvedic-chat.tsx
        +ayurvedic-chat-new.tsx
        +ayurvedic-embedding-chat.tsx
        +ayurvedic-qdrant-chat.tsx
    }
    
    %% API Layer (Route Handlers)
    class APIRoutes {
        +chat/route.ts
        +ayurveda/route.ts
        +embedyurveda/route.ts
        +embedqdrant/route.ts
        +ex1-4/route.ts
    }
    
    %% Core Services Layer
    class VectorStoreService {
        -vectorStore: Chroma|MemoryVectorStore|QdrantVectorStore
        -embeddings: OpenAIEmbeddings
        -config: VectorStoreConfig
        +addDocuments(documents)
        +similaritySearch(query, k, filter)
        +similaritySearchWithScore(query, k, filter)
        +deleteCollection()
        +getCollectionInfo()
    }
    
    class QdrantVectorStore {
        -client: QdrantClient
        -embeddings: OpenAIEmbeddings
        -collectionName: string
        +ensureCollection()
        +addDocuments(documents)
        +similaritySearch(query, k, filter)
        +buildQdrantFilter(filter)
    }
    
    %% Data Layer
    class DataSources {
        +ayurcheck_rag.jsonl
        +ayurcheck_api_vol1.json
        +ayurvedic_tips_enhanced.json
        +states.json
        +AyurCheck_API-Vol-1.pdf
    }
    
    %% External Services
    class ExternalServices {
        <<interface>>
        +OpenAI API
        +Qdrant Database
        +Chroma Database
    }
    
    %% Metadata Interface
    class AyurvedaMetadata {
        +herb_name?: string
        +botanical_name?: string
        +condition?: string
        +dosha_type?: "vata"|"pitta"|"kapha"|"tridosha"
        +category: "remedy"|"herb"|"lifestyle"|"diagnosis"|"pharmacopoeia"
        +source_document: string
        +page_number?: number
        +benefits?: string
        +usage?: string
        +caution?: string
        +document_id: string
    }
    
    %% Relationships
    App --> Pages : renders
    Pages --> ChatComponents : uses
    ChatComponents --> UIComponents : imports
    ChatComponents --> APIRoutes : calls
    APIRoutes --> VectorStoreService : uses
    VectorStoreService --> QdrantVectorStore : implements
    VectorStoreService --> ExternalServices : integrates
    QdrantVectorStore --> AyurvedaMetadata : uses
    APIRoutes --> DataSources : loads
    VectorStoreService --> DataSources : processes
```

## Component Architecture Diagram

```mermaid
graph TB
    %% Frontend Layer
    subgraph "Frontend Layer"
        A[Next.js App Router]
        B[React Components]
        C[UI Components]
        D[Chat Interfaces]
    end
    
    %% API Layer
    subgraph "API Layer"
        E[Route Handlers]
        F[RAG Endpoints]
        G[Chat Endpoints]
    end
    
    %% Service Layer
    subgraph "Service Layer"
        H[Vector Store Service]
        I[Embedding Service]
        J[Document Processing]
    end
    
    %% Data Layer
    subgraph "Data Layer"
        K[JSON/JSONL Files]
        L[PDF Documents]
        M[Structured Data]
    end
    
    %% External Services
    subgraph "External Services"
        N[OpenAI API]
        O[Qdrant Vector DB]
        P[Chroma Vector DB]
    end
    
    %% Connections
    A --> B
    B --> C
    B --> D
    D --> E
    E --> F
    E --> G
    F --> H
    G --> H
    H --> I
    H --> J
    J --> K
    J --> L
    J --> M
    H --> N
    H --> O
    H --> P
```

## Key Components Description

### 1. **Presentation Layer**
- **App Router Structure**: Next.js 13+ app directory with layout and pages
- **React Components**: Specialized chat interfaces for Ayurvedic knowledge
- **UI Components**: Reusable shadcn/ui components (Button, Input)

### 2. **API Layer**
- **Route Handlers**: RESTful endpoints for chat and RAG functionality
- **Specialized Endpoints**: 
  - `/api/embedqdrant` - Qdrant-powered RAG
  - `/api/embedyurveda` - Ayurveda-specific embeddings
  - `/api/chat` - Basic OpenAI chat

### 3. **Service Layer**
- **VectorStoreService**: Unified interface for multiple vector databases
- **QdrantVectorStore**: Specialized Qdrant implementation
- **Embedding Integration**: OpenAI text-embedding-3-small model

### 4. **Data Layer**
- **Structured Data**: JSONL format for RAG documents
- **Source Documents**: PDF processing and JSON conversion
- **Metadata**: Rich Ayurvedic metadata with dosha types and categories

### 5. **External Integrations**
- **OpenAI**: GPT models and embeddings
- **Qdrant**: High-performance vector database
- **Chroma**: Alternative vector database option

## Architecture Patterns

1. **RAG Pattern**: Retrieval-Augmented Generation for knowledge-based responses
2. **Strategy Pattern**: Multiple vector store implementations
3. **Factory Pattern**: Vector store service creation
4. **Repository Pattern**: Data access abstraction
5. **Microservices**: Separate API endpoints for different functionalities

## Technology Stack

- **Frontend**: Next.js 13+, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Vector Databases**: Qdrant, Chroma, In-memory
- **AI/ML**: OpenAI GPT-4, OpenAI Embeddings
- **Data Processing**: LangChain, Document processing
- **UI Framework**: shadcn/ui, Radix UI