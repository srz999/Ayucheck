# RAG System Architecture Diagrams (Mermaid)

## 1. High-Level System Architecture

```mermaid
flowchart TB
    subgraph User["👤 User Interface"]
        UI[Next.js React Chat UI<br/>Vercel AI SDK]
    end
    
    subgraph API["🔧 API Layer"]
        API_Route["/api/embedpinecone<br/>Serverless Function"]
    end
    
    subgraph Processing["⚙️ RAG Pipeline"]
        Embed[OpenAI Embeddings<br/>text-embedding-3-small<br/>1536 dimensions]
        RAG[LangChain RAG Chain<br/>Context + Prompt + LLM]
        LLM[GPT-4o-mini<br/>Temperature: 0.3]
    end
    
    subgraph Storage["💾 Vector Database"]
        Pinecone[(Pinecone Cloud<br/>409 vectors<br/>Cosine similarity)]
    end
    
    subgraph Data["📄 Data Sources"]
        PDFs[Ayurvedic PDFs<br/>241 pages total]
        Processing_Pipeline[Data Processing Pipeline<br/>See Diagram #3]
    end
    
    UI -->|HTTP POST| API_Route
    API_Route -->|Query| Embed
    Embed -->|Vector Search| Pinecone
    Pinecone -->|Top-5 matches| RAG
    RAG -->|Context| LLM
    LLM -->|Streaming| API_Route
    API_Route -->|SSE Stream| UI
    
    PDFs -->|Offline Processing| Processing_Pipeline
    Processing_Pipeline -->|409 Vectors| Pinecone
    
    style User fill:#e1f5ff
    style API fill:#fff4e1
    style Processing fill:#f0e1ff
    style Storage fill:#e1ffe1
    style Data fill:#ffe1e1
```

## 2. Technology Stack Overview (Layered Architecture)

```mermaid
graph TD
    subgraph Layer6["🚀 INFRASTRUCTURE LAYER"]
        direction LR
        L6A[Vercel Edge CDN<br/>99.99% SLA]
        L6B[GitHub CI/CD]
        L6C[Secrets Management]
    end
    
    subgraph Layer5["📄 DATA PROCESSING LAYER - Offline"]
        direction LR
        L5A[MinerU Pipeline<br/>LayoutLMv3 + UnimerNet]
        L5B[Table Transformer<br/>DETR Detection]
        L5C[Batch Embedding<br/>100 vectors/batch]
    end
    
    subgraph Layer4["💾 DATA LAYER"]
        direction LR
        L4A[Pinecone Index<br/>ayurveda-knowledge]
        L4B[Vector Search<br/>Cosine Similarity]
        L4C[409 Vectors<br/>~50ms latency]
    end
    
    subgraph Layer3["🤖 AI/ML SERVICES LAYER"]
        direction LR
        L3A[OpenAI Embeddings<br/>text-embedding-3-small<br/>1536-dim, ~180ms]
        L3B[OpenAI GPT-4o-mini<br/>8K context<br/>~300ms TTFT]
    end
    
    subgraph Layer2["⚙️ APPLICATION LAYER"]
        direction LR
        L2A[REST API<br/>/api/embedpinecone]
        L2B[Serverless Functions<br/>Auto-scaling]
        L2C[LangChain RAG<br/>Orchestration]
        L2D[HTTP SSE<br/>Streaming]
        L2E[Prompt Templates]
    end
    
    subgraph Layer1["🎨 PRESENTATION LAYER"]
        direction LR
        L1A[React 18]
        L1B[Next.js 14<br/>App Router + RSC]
        L1C[TypeScript]
        L1D[Vercel AI SDK]
        L1E[Tailwind + shadcn/ui]
    end
    
    Layer1 --> Layer2
    Layer2 --> Layer3
    Layer2 --> Layer4
    Layer3 --> Layer4
    Layer5 --> Layer4
    
    style Layer1 fill:#e1f5ff,stroke:#0066cc,stroke-width:4px
    style Layer2 fill:#fff4e1,stroke:#cc6600,stroke-width:4px
    style Layer3 fill:#f0e1ff,stroke:#9933cc,stroke-width:4px
    style Layer4 fill:#e1ffe1,stroke:#009900,stroke-width:4px
    style Layer5 fill:#ffe1e1,stroke:#cc0000,stroke-width:4px
    style Layer6 fill:#e1e1ff,stroke:#6666cc,stroke-width:4px
```

## 3. RAG Query Flow

```mermaid
sequenceDiagram
    participant User
    participant NextJS as Next.js UI
    participant API as API Route
    participant OpenAI as OpenAI API
    participant Pinecone as Pinecone DB
    participant LLM as GPT-4o-mini

    User->>NextJS: Ask question
    NextJS->>API: POST /api/embedpinecone
    
    API->>OpenAI: Generate query embedding
    OpenAI-->>API: 1536-dim vector (180ms)
    
    API->>Pinecone: Vector similarity search
    Pinecone-->>API: Top-5 documents (50ms)
    
    API->>API: Filter by threshold (0.7)
    API->>API: Format context
    
    API->>LLM: RAG Chain: Context + Query
    LLM-->>API: Stream response (300ms first token)
    
    API-->>NextJS: SSE streaming
    NextJS-->>User: Display answer (600ms to first token)
```

## 3.1 Data Processing Pipeline - Pinecone Flow (Production)

```mermaid
flowchart LR
    subgraph Input["📥 Input"]
        direction TB
        PDF1[Pharmacopoeia<br/>241 pages]
        PDF2[Skin Diseases<br/>48 pages]
        PDF3[Mental<br/>Disorders]
    end
    
    subgraph Extract["🔄 Extraction"]
        direction TB
        MinerU[MinerU<br/>LayoutLMv3<br/>PaddleOCR]
        TableTrans[Table<br/>Transformer<br/>DETR]
    end
    
    subgraph Output["📤 Data"]
        direction TB
        TextChunks[Text: 397]
        Tables[Tables: 4]
        Formulas[Formulas: 6]
        AllChunks[Total: 409]
    end
    
    subgraph Format["📝 Format"]
        direction TB
        JSON[JSON]
        JSONL[JSONL]
        MD[MD]
    end
    
    subgraph Embed["🧮 Vectorize"]
        direction TB
        OpenAI[OpenAI<br/>Embeddings<br/>1536-dim]
        Vectors[409 vectors<br/>Custom IDs]
        IDFormat[doc_0_a1b2c3d4]
    end
    
    subgraph Upload["☁️ Pinecone"]
        direction TB
        Pinecone[(Pinecone Cloud<br/>ayurveda-knowledge)]
        Batch[100 vectors/batch<br/>5 batches<br/>~10 seconds]
    end
    
    Input --> Extract
    Extract --> Output
    Output --> Format
    Format --> Embed
    Embed --> Upload
    
    PDF1 & PDF2 & PDF3 --> MinerU
    PDF2 --> TableTrans
    MinerU --> TextChunks & Formulas
    TableTrans --> Tables
    TextChunks & Tables & Formulas --> AllChunks
    AllChunks --> JSON & JSONL & MD
    JSONL --> OpenAI
    OpenAI --> Vectors
    Vectors --> IDFormat
    IDFormat --> Pinecone
    Pinecone --> Batch
    
    style Input fill:#ffe1e1
    style Extract fill:#fff4e1
    style Output fill:#f0e1ff
    style Format fill:#e1f5ff
    style Embed fill:#e1ffe1
    style Upload fill:#e1ffe1
```

## 3.2 Data Processing Pipeline - Qdrant Flow (Alternative)

```mermaid
flowchart LR
    subgraph Input["📥 Input"]
        direction TB
        PDF1[Pharmacopoeia<br/>241p]
        PDF2[Skin Diseases<br/>48p]
        PDF3[Mental<br/>Disorders]
    end
    
    subgraph Extract["🔄 Extract"]
        direction TB
        MinerU[MinerU<br/>LayoutLMv3]
        TableTrans[Table<br/>Transform]
    end
    
    subgraph Output["📤 Data"]
        direction TB
        AllChunks[409<br/>Chunks]
    end
    
    subgraph Embed["🧮 Vectorize"]
        direction TB
        OpenAI[OpenAI<br/>1536-dim]
        IDFormat[UUID<br/>Format]
    end
    
    subgraph Docker["🐳 Docker Container (localhost:6333)"]
        direction TB
        AutoCreate[Auto-create<br/>collection]
        Qdrant[(Qdrant DB<br/>ayurveda-knowledge<br/>1536 dimensions)]
        Batch[10 vectors/batch<br/>41 batches<br/>~82 seconds]
        Storage[Persistent<br/>Storage]
    end
    
    Input --> Extract
    Extract --> Output
    Output --> Embed
    Embed --> Docker
    
    PDF1 & PDF2 & PDF3 --> MinerU
    PDF2 --> TableTrans
    MinerU & TableTrans --> AllChunks
    AllChunks --> OpenAI
    OpenAI --> IDFormat
    IDFormat --> AutoCreate
    AutoCreate --> Qdrant
    Qdrant --> Batch
    Batch --> Storage
    
    style Input fill:#ffe1e1
    style Extract fill:#fff4e1
    style Output fill:#f0e1ff
    style Embed fill:#e1ffe1
    style Docker fill:#e8f4f8,stroke:#2196F3,stroke-width:3px
```

## 4. Technology Stack

```mermaid
graph TB
    subgraph Frontend["🎨 Frontend Layer"]
        React[React Components]
        VercelSDK[Vercel AI SDK]
        TailwindCSS[Tailwind CSS]
    end
    
    subgraph Backend["⚙️ Backend Layer"]
        NextAPI[Next.js API Routes]
        LangChain[LangChain]
        Streaming[HTTP Streaming]
    end
    
    subgraph ML["🤖 AI/ML Services"]
        Embeddings[OpenAI Embeddings<br/>text-embedding-3-small]
        LLM[OpenAI GPT-4o-mini]
    end
    
    subgraph Database["💾 Vector Database"]
        Pinecone[Pinecone Cloud<br/>Managed Service]
    end
    
    subgraph Processing["📄 Document Processing"]
        MinerU[MinerU<br/>PDF Extraction]
    end
    
    subgraph Deployment["🚀 Deployment"]
        Vercel[Vercel Platform<br/>Serverless Functions]
    end
    
    Frontend --> Backend
    Backend --> ML
    Backend --> Database
    Processing --> Database
    Backend --> Deployment
    
    style Frontend fill:#e1f5ff
    style Backend fill:#fff4e1
    style ML fill:#f0e1ff
    style Database fill:#e1ffe1
    style Processing fill:#ffe1e1
    style Deployment fill:#e1e1ff
```

## 5. Vector Search Process

```mermaid
flowchart TD
    Query[User Query:<br/>"What herbs help with Vata?"]
    
    subgraph Embed["Embedding Generation"]
        QueryEmbed[Convert to 1536-dim vector<br/>~180ms]
    end
    
    subgraph Search["Vector Search"]
        Pinecone[(Pinecone Index<br/>409 vectors)]
        Cosine[Cosine Similarity<br/>cos θ = q·d / ||q||||d||]
        TopK[Retrieve top-5 matches]
    end
    
    subgraph Filter["Post-Processing"]
        Threshold{Score ≥ 0.7?}
        Keep[Keep relevant docs]
        Fallback[Use top-3 as fallback]
    end
    
    subgraph RAG["RAG Generation"]
        Context[Format context from docs]
        Prompt[Inject into prompt template]
        Generate[GPT-4o-mini generation]
        Response[Streaming response]
    end
    
    Query --> QueryEmbed
    QueryEmbed --> Pinecone
    Pinecone --> Cosine
    Cosine --> TopK
    TopK --> Threshold
    Threshold -->|Yes| Keep
    Threshold -->|No| Fallback
    Keep --> Context
    Fallback --> Context
    Context --> Prompt
    Prompt --> Generate
    Generate --> Response
    
    style Query fill:#e1f5ff
    style Search fill:#e1ffe1
    style Filter fill:#fff4e1
    style RAG fill:#f0e1ff
```

## 6. Deployment Architecture

```mermaid
graph TB
    subgraph Global["🌍 Global Distribution"]
        CDN[Vercel Edge Network<br/>Global CDN]
    end
    
    subgraph App["📱 Application"]
        Frontend[Next.js Frontend<br/>Edge Runtime]
        API[API Routes<br/>Node.js Runtime<br/>Serverless Functions]
    end
    
    subgraph External["☁️ External Services"]
        OpenAI[OpenAI API<br/>Embeddings + LLM]
        Pinecone[Pinecone Cloud<br/>Vector Database<br/>us-east-1-aws]
    end
    
    subgraph Config["⚙️ Configuration"]
        Env[Environment Variables<br/>• PINECONE_API_KEY<br/>• OPENAI_API_KEY<br/>• INDEX_NAME]
    end
    
    CDN --> Frontend
    Frontend --> API
    API --> OpenAI
    API --> Pinecone
    Env -.->|Config| API
    
    style Global fill:#e1f5ff
    style App fill:#fff4e1
    style External fill:#e1ffe1
    style Config fill:#ffe1e1
```

## 7. Performance Metrics

```mermaid
gantt
    title RAG Query Processing Timeline
    dateFormat X
    axisFormat %L ms
    
    section Query Processing
    Parse Request           :0, 20
    Generate Embedding      :20, 200
    Vector Search          :220, 70
    Filter Results         :290, 20
    Format Context         :310, 50
    
    section LLM Generation
    First Token            :360, 240
    Complete Stream        :600, 2400
    
    section User Experience
    First Token Visible    :crit, 600, 1
    Response Complete      :3000, 1
```

## Usage Instructions

Copy any of these Mermaid diagrams and paste them into:

1. **PowerPoint**: Use Mermaid plugins or convert to images
   - Online tool: https://mermaid.live/
   - Export as PNG/SVG for slides

2. **Markdown**: Works directly in GitHub, VS Code, etc.

3. **Documentation**: Include in technical docs

## Conversion Tips for PowerPoint

1. Visit https://mermaid.live/
2. Paste the Mermaid code
3. Customize colors/style if needed
4. Export as PNG (high resolution) or SVG
5. Insert image into PowerPoint slide

## Recommended Diagrams for Presentation

- **Slide 1**: Diagram #1 (High-Level System Architecture) - Overview
- **Slide 2**: Diagram #3 (RAG Query Flow) - How it works
- **Slide 3**: Diagram #3.1 (Data Processing Pipeline - Pinecone) - Main production flow
- **Slide 4**: Diagram #3.2 (Data Processing Pipeline - Qdrant) - Alternative implementation
- **Slide 5**: Diagram #4 (Technology Stack) - Tech components
- **Slide 6**: Diagram #7 (Performance Metrics) - Results

## Key Differences Between 3.1 (Pinecone) and 3.2 (Qdrant)

| Feature | Pinecone (3.1) | Qdrant (3.2) |
|---------|----------------|--------------|
| **Deployment** | Cloud-only (managed) | Local Docker container (`localhost:6333`) |
| **ID Format** | Custom short: `doc_0_a1b2c3d4` | Full UUID: `550e8400-e29b-...` |
| **Batch Size** | 100 vectors/batch | 10 vectors/batch |
| **Total Batches** | 5 batches | 41 batches |
| **Upload Time** | ~10 seconds | ~82 seconds |
| **Collection** | Manual creation required | Auto-creates if not exists |
| **Hosting** | Pinecone cloud servers | Docker container (local development) |
| **Connection** | Internet required | Localhost (no internet for DB) |
