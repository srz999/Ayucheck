# III. Methodology

This section describes our approach to building a structure-aware RAG system for Ayurvedic medical texts. The methodology encompasses dataset preparation, preprocessing pipeline, system architecture, and model selection.

## A. Dataset Overview

The primary dataset for this research is the Ayurvedic Pharmacopoeia of India, Part-I, Volume-I, which serves as an authoritative reference for Ayurvedic medicinal plants. This comprehensive document contains detailed monographs covering Sanskrit names, botanical nomenclature, medicinal properties, and therapeutic applications.

The source material presents significant structural complexity with 241 pages containing heterogeneous content types. The document layout includes standard text passages describing herb properties, structured tables presenting medicinal characteristics, chemical formulas for compound identification, and botanical illustrations for plant identification.

Processing this document yielded 220+ semantically coherent text chunks through our extraction pipeline. The content distribution analysis revealed 212 text segments, 2 tabular structures, 6 chemical formulas, and 9 botanical images. Each extracted chunk maintained an average length of approximately 1,128 characters, ensuring sufficient context for semantic retrieval while remaining within token limits for embedding generation.

**Fig. 1. Dataset Composition** *(Placeholder for pie chart showing content type distribution)*

## B. Dataset Preprocessing

### PDF Parsing Tool Selection
A critical decision in our methodology involved selecting an appropriate PDF extraction tool. We conducted a comparative evaluation of three candidate systems:

**Docling (IBM library)** demonstrated limitations in handling continuous text spanning multiple pages, a common occurrence in medical monographs. Additionally, its processing speed was inferior to alternative solutions.

**PyMuPDF** successfully extracted 39,948 words with superior speed characteristics. However, the extracted content exhibited ordering inconsistencies during verification, rendering it unsuitable for structured knowledge base construction.

**MinerU** emerged as our final choice due to its AI-powered document understanding capabilities. Leveraging LayoutLMv3 for layout detection, this tool provided comprehensive extraction of text, tables, formulas, and images while maintaining structural fidelity. The resulting data quality significantly exceeded that of traditional text extraction tools.

### Tabular Content Extraction
Medical texts frequently present information in tabular format, particularly for properties like taste, potency, and therapeutic actions. We employed the **Microsoft Table Transformer**, built upon the DETR (Detection Transformer) architecture, to handle this structured content.

The table extraction pipeline operates in three stages: (1) table detection identifies bounding box coordinates on PDF pages, (2) structure recognition analyzes the internal organization of detected tables to identify rows, columns, and cell boundaries, and (3) data extraction converts recognized structures into machine-readable formats (JSON/JSONL) compatible with our RAG pipeline.

### Chunking and Metadata Enrichment
Following extraction, the raw content underwent semantic chunking based on natural document boundaries such as individual herb monographs or subsections within larger chapters. This approach ensures that each chunk maintains topical coherence rather than arbitrary character-count divisions.

Each chunk received metadata annotations including `page_number` for citation verification, `section` identifier for the herb or chapter name, content `type` classification (text, table, formula, image), and `source` document reference. This metadata framework enables filtered retrieval and source attribution in generated responses.

The preprocessing pipeline successfully extracted 409 semantically meaningful chunks from three Ayurvedic reference texts, forming the foundation of our knowledge base.

### Embedding Generation
To enable semantic search capabilities, we converted text chunks into dense vector representations using OpenAI's `text-embedding-3-small` model. This model produces 1536-dimensional embeddings that capture semantic meaning beyond keyword matching. The embedding process transforms natural language descriptions into vectors amenable to cosine similarity-based retrieval.

## C. System Architecture and Methodology Overview

Our system implements a cloud-native Retrieval-Augmented Generation architecture designed for production deployment. The methodology follows a five-stage pipeline:

1. **Document Processing**: MinerU performs structure-aware extraction, preserving medical terminology and document layout.
2. **Vector Embedding**: The `text-embedding-3-small` model generates 1536-dimensional semantic vectors for all text chunks.
3. **Vector Database Storage**: Pinecone cloud database stores 409 document vectors with associated metadata across 3 namespaces.
4. **Semantic Search**: User queries undergo embedding and similarity search to retrieve the top-5 most relevant chunks (cosine similarity threshold: 0.7).
5. **LLM Generation**: GPT-4o-mini synthesizes retrieved context into coherent responses with source citations.

### Architectural Components

The system architecture follows a three-tier design pattern:

**Frontend Layer (React/Next.js)**: The presentation layer implements a responsive chat interface with real-time streaming support. The Vercel AI SDK manages conversation state and provides automatic reconnection handling. Deployment on edge runtime ensures global distribution with minimal latency.

**API Layer (Next.js Serverless Functions)**: The `/api/embedpinecone` route serves as the primary endpoint for query processing. This layer implements request validation, error handling, and orchestrates the RAG chain using LangChain's expression language (LCEL). The serverless architecture enables automatic scaling while minimizing operational overhead.

**Backend Services**: The infrastructure layer comprises two primary services: OpenAI's API for embedding generation (text-embedding-3-small) and language model inference (GPT-4o-mini), and Pinecone's managed vector database for persistent storage and similarity search of 1536-dimensional vectors using cosine similarity metrics.

**Fig. 2. System Architecture Diagram**

```
Offline Processing:
PDF Document (241 pages) → MinerU Parser → 409 Text Chunks → 
OpenAI Embeddings (1536-d) → Pinecone Upload

Online Query Processing:
User Question → Query Embedding → Pinecone Search (Top-5) → 
Context + Query → GPT-4o-mini → Streaming Response
```

## D. Model Architecture and Technology Stack

### Core Technologies
Our implementation leverages modern cloud-native technologies selected for production readiness:

| Technology | Purpose | Justification |
|:-----------|:--------|:--------------|
| **Next.js** | Full-stack framework with SSR & API routes | Unified frontend/backend development |
| **Pinecone** | Managed vector database | Eliminates infrastructure management overhead |
| **LangChain** | RAG pipeline orchestration | Standardized abstractions for LLM applications |

### AI Model Selection
The system employs three specialized AI models:

| Model | Specification | Role |
|:------|:-------------|:-----|
| **OpenAI Embeddings** | text-embedding-3-small (1536-d) | Semantic vector generation |
| **GPT-4o-mini** | Temperature: 0.3, Streaming enabled | Response generation |
| **MinerU** | LayoutLMv3-based | Structure-aware PDF parsing |

### Vector Database Architecture
The production system utilizes **Pinecone**, a fully managed cloud vector database offering horizontal scalability and sub-100ms query latency. During development, we employed **Qdrant** running in a Docker container for local verification and testing, enabling rapid iteration without cloud API costs.

### RAG Pipeline Flow
The retrieval-augmented generation process follows this sequence:

1. **Query Processing**: User submits natural language question through chat interface.
2. **Query Embedding**: The question undergoes vectorization using the same embedding model applied to document chunks.
3. **Similarity Search**: Pinecone performs approximate nearest neighbor search using cosine similarity: $\cos(\theta) = \frac{q \cdot d}{||q|| \times ||d||}$ where $q$ represents the query vector and $d$ represents document vectors.
4. **Context Assembly**: Top-5 most similar chunks are retrieved and concatenated with metadata.
5. **Prompt Construction**: Retrieved context is injected into a structured prompt template with system instructions.
6. **LLM Inference**: GPT-4o-mini generates a response conditioned on the retrieved context, reducing hallucination risk.
7. **Response Delivery**: The answer streams token-by-token to the client via Server-Sent Events (SSE) for improved user experience.
