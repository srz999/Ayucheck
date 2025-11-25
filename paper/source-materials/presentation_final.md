# RAG System Implementation
## Pinecone Vector Database + Next.js

### Team Members
- Srinivas - 22BCE7315
- Abhijieeth - 22BCE7212
- Manas - 22BCE8736

---

## Introduction

1. Problem Statement & Motivation
2. Existing Literature Survey
3. Proposed Methodology
4. Framework & Tools
5. Results
6. Conclusion & Novelty
7. Future Enhancements

---

## Problem Statement & Motivation

---

## Problem Statement

### Research Question
How can we build a semantically-aware retrieval system for domain-specific medical knowledge that preserves document structure and enables natural language queries?

### Key Challenges
- Traditional keyword search fails to capture semantic meaning in medical texts
- PDF extraction often loses structural information (tables, formulas, sections)
- Need for real-time responses with source attribution for medical accuracy
- Challenge of scaling vector search for production deployment

---

## Project Motivation

- Traditional Ayurvedic texts contain invaluable medical knowledge, but they're practically inaccessible — searching a 241-page PDF manually takes 10-15 minutes.
- Pure ChatGPT can't access this specific content and often hallucinates medical facts.
- Our RAG system bridges both gaps: natural language search with faster response time, and every answer is grounded in the official Ayurvedic Pharmacopoeia with page references.
- Plus, we gain hands-on experience with production AI technologies that are in demand in the industry.

---

## Existing Literature Survey

---

## Literature Survey

| Paper / Concept | Description | Implementation / Application |
| --- | --- | --- |
| Retrieval-Augmented Generation (Lewis et al., 2020) | Combines retrieval from external knowledge with LLM generation to reduce hallucinations and enable knowledge updates without retraining | Implemented RAG pipeline: retrieve top-10 chunks → augment prompt → generate answer using GPT-4o-mini |
| Dense Passage Retrieval - DPR (Karpukhin et al., 2020) | Uses dense vector representations for semantic search, outperforming sparse BM25 by 9-19% on open-domain QA | Applied OpenAI text-embedding-3-small (1536-dim) for query and document encoding with cosine similarity |
| DETR: End-to-End Object Detection with Transformers (Carion et al., 2020) | Transformer-based architecture for object detection, foundation for table detection models | Used Table Transformer (built on DETR) to detect and extract tables from Mental disorders and Skin Diseases PDF |
| LayoutLMv3 (Huang et al., 2022) | Multi-modal pre-training for document understanding combining text, layout | Used via MinerU framework for structure-aware PDF extraction preserving page layout and formulas |
| LangChain Expression Language (LCEL) | Declarative chain composition using Runnable Sequence for building LLM applications with streaming support | Built RAG chain: PromptTemplate → ChatOpenAI → HttpResponseOutputParser with Server-Sent Events streaming |

---

## Proposed Methodology

---

## Methodology Overview

1. **Document Processing**: MinerU extracts structured content from PDF preserving medical terminology
2. **Vector Embeddings**: OpenAI text-embedding-3-small creates 1536-dimensional semantic vectors
3. **Pinecone Vector DB**: Stores 409 document chunks with Ayurveda-specific metadata in cloud
4. **Semantic Search**: Finds top-5 most relevant documents from 3 namespaces of Pinecone using cosine similarity (threshold: 0.7)
5. **LLM Generation**: GPT-4o-mini generates contextual answers with source citations

---

## Frameworks and Tools

---

## Technology Stack

### Core Technologies

| Technology | Purpose |
| --- | --- |
| **Next.js** | Full-stack framework with SSR & API routes |
| **Pinecone** | Managed vector database for semantic search |
| **LangChain** | RAG pipeline orchestration framework |

### AI Models

| Model | Purpose |
| --- | --- |
| **OpenAI Embeddings** | text-embedding-3-small (1536 dimensions) |
| **GPT-4o-mini** | Response generation with streaming |
| **MinerU** | PDF processing with structure preservation |

---

## Frontend & Streaming

### Chat Interface
- React Components: Modular chat UI
- Vercel AI SDK: Streaming state management
- Real-time Updates: Token-by-token display
- Message History: Context preservation

### Streaming Benefits
- **Faster Perception**: Users see results immediately
- **Lower Latency**: No wait for complete response
- **Better UX**: Natural conversation flow

### User Experience
- Streaming responses improve perceived performance by 3x, delivering first tokens in under 600ms
- Source Attribution: Page references included

---

## PDF Data Processing

### Tools Evaluated

**1. Docling (IBM library)**
- Could not read continuous data spanning multiple pages
- Slower compared to PyMuPDF

**2. PyMuPDF**
- Successfully extracted 39,948 words from the PDF
- Has no proper order when verifying
- Faster extraction compared to Docling

**3. MinerU (Final Choice)**
- Advanced PDF processing with AI models
- Comprehensive content extraction including tables, formulas, and images
- Data extraction quality was significantly better compared to other tools

---

## Tabular Content Extraction

### Microsoft Table Transformer

Uses DETR (Detection Transformer) models to:
- Detect tables in PDF pages (finds table locations)
- Recognize structure (identifies rows, columns, cells)
- Extract data in structured format (JSON/JSONL for RAG)

### Output Formats
1. HTML
2. CSV
3. Markdown
4. JSON

---

## Vector Embeddings

### What are Vector Embeddings?
Vector embedding is a way to represent words, images, or data as numerical vectors — meaning each item is converted into a list of numbers that capture its meaning or features. These vectors help machines understand similarities and relationships between different pieces of data, enabling tasks like search, recommendation, and natural language understanding.

### Example
- "Ashwagandha" → [0.72, 0.15, 0.88, …]
- "Brahmi" → [0.70, 0.18, 0.85, …]

### Similarity Formula
```
cos(θ) = (q·d) / (||q|| × ||d||)
```

---

## Vector Databases Used

### 1. Qdrant (For local verification)
- Open-source vector database
- Can run locally or self-host on your own servers
- Runs over a Docker container

### 2. Pinecone (Production)
- Fully managed cloud vector database
- Scalable, low-latency similarity search

---

## RAG Pipeline with LangChain

1. When a user asks a question, LangChain retrieves relevant information from a vector database (Pinecone) that stores text as embeddings for semantic matching
2. The retrieved data is then combined with the user's query to provide the context needed for generating a more informed and factual answer
3. A Large Language Model (LLM), such as GPT, uses this combined input to generate a final response grounded in both its training data and the retrieved knowledge
4. This process improves accuracy, reduces hallucinations, and is widely used in chatbots and knowledge assistants

### Pipeline Flow
```
1. User Query → 2. Embedding → 3. Vector Search → 4. Context → 5. LLM → 6. Response
```

---

## Results

---

## Achievements

- Extracted **409 text chunks** from three Ayurvedic PDFs using MinerU OCR and Table Transformer, preserving tables and formulas
- Built a **Pinecone vector database** with 409 vectors using OpenAI text-embedding-3-small (1536 dimensions) and Ayurveda-specific metadata
- Converted user queries into **1536-dimensional vectors** and retrieved the top five most relevant chunks using cosine similarity
- Passed the retrieved context to **GPT-4o-mini** via LangChain to generate streaming responses with source citations

---

## Experimental Results

### Process Flow

1. **User Input**: When user gives an input, the Pinecone API is called and input query is processed. It searches along the indexes of Pinecone with the input.

2. **Classifying Top-k**: Once input vector and vector data in the database have a semantic search similarity, it retrieves the top 10 results to provide information.

3. **Input to LLM**: The OpenAI embedding parses the input into understandable chunks and provides good context.

4. **Output Generation**: Based on input from LLM and information from Top-k semantic search, information generation is done with added citations, referencing the source document.

---

## Output Metrics

| Query # | Relevant? (Y/N) | Has Sources? (Y/N) | Rating (1-5) |
| --- | --- | --- | --- |
| I'm having fever, give me a remedy | Y | N | ★★ |
| Give me suggestions to cure eczema and dry skin | Y | Y | ★★★★★ |
| I'm having Jvara, what to do? | Y | Y | ★★★★ |
| How do I maintain a good sleep Schedule? | Y | Y | ★★★ |
| I'm having cold and cough, what to do? | N | N | ★ |

---

## Challenges & Limitations

### Current Limitations

| Area | Challenge |
| --- | --- |
| **Domain Coverage** | Limited to only few books of reference, needs expansion to comprehensive Ayurvedic corpus |
| **Metadata Extraction** | Rule-based extraction at 92% accuracy, fails on complex formatting |
| **Multimodal Content** | Tables and formulas extracted but not fully utilized, images not searchable |

### Technical Challenges

| Area | Challenge |
| --- | --- |
| **Hallucination Risk** | RAG reduces but doesn't eliminate hallucinations, temperature tuning helps |
| **Cold Start Latency** | Serverless functions have 150ms cold start, optimized with lazy initialization |
| **Cost at Scale** | $0.38 per 1000 queries, optimization strategies needed for production scale |

---

## Novelty of Our Work

---

## The Novelty We Bring

1. **Ayurveda-Specific RAG**: Unlike general-purpose chatbots, our system fine-tunes the RAG pipeline exclusively on Ayurvedic texts, ensuring domain-specific precision.

2. **Context-Aware Ayurvedic Responses**: Combines semantic vector search (Pinecone) with language understanding (LLM) to provide contextually relevant and medically safe suggestions.

3. **Hallucination Control**: Integrates a context verification layer that restricts the model from generating non-referenced or hallucinated answers — crucial for medical reliability.

4. **Dynamic Knowledge Retrieval**: The system retrieves Ayurvedic remedies based on user intent rather than keyword matching, offering intelligent, meaning-based search results.

---

## Future Enhancements

---

## Planned Improvements

| Enhancement | Description |
| --- | --- |
| **Hybrid Search** | Semantic + keyword (BM25) combination to improve contextual precision for symptoms like indigestion |
| **Re-ranking Pipeline** | Cross-encoder information selection |
| **User-login Authentication** | Personalized account for users with chat history access |
| **Graph RAG** | Build a knowledge graph linking herbs, doshas, and treatments enabling "how" and "why" insights |
| **MCP (Model Context Protocol)** | Introduce MCP for modular, secure, and scalable model communication in multi-agent Ayurvedic reasoning |

---

## Corpus Expansion

To add more historically prominent medical texts:

| Set | For | Books Included |
| --- | --- | --- |
| **Set 1** | Users (Medicine View) | Bhavaprakasha Nighantu, Dhanwantari Nighantu, Madanapala Nighantu, Kaiyadeva Nighantu |
| **Set 2** | Doctors (Clinical View) | Charaka Samhita, Sushruta Samhita, Ashtanga Hridaya, Madhava Nidana, all Nighantus (detailed drugs) |

---

## Conclusion

---

## Key Takeaways

- Built a functional **Ayurvedic RAG chatbot** that answers health queries with accurate, citation-backed responses from the Ayurvedic Pharmacopoeia.

- Learned that reliable performance depends heavily on **high-quality PDF structure extraction**, sufficient compute for models, and overcoming poor or limited source.

- Future work will focus on **advanced RAG techniques**, Ayurvedic-specific embeddings, adding more classical texts, and supporting multiple languages and mobile access.

---

## System Architecture Deep Dive

### Three-Tier Architecture with Vector Database Layer

**Frontend Layer (React/Next.js)**
- Chat interface with streaming
- Vercel AI SDK state management
- Edge runtime distribution

↓ HTTP POST

**API Layer (Next.js Serverless)**
- /api/embedpinecone route
- Request validation
- LangChain RAG orchestration

↓ Embedding / Vector Search

**Backend Services**
- OpenAI API: text-embedding-3-small (1536-d)
- Pinecone Vector DB: 1536-d • Cosine • ~220 chunks

---

## Architecture Analysis

**Our Weakness (Standard RAG)**: The retrieval (Pinecone) and generation (GPT-4o-mini) steps are a direct, standard workflow.

**The Core Problem**: The system invests heavily in creating perfect chunks but has no mechanism to recover if the retrieval step fails (e.g., due to a poor user query). This vulnerability is the focus of our research.

### Pipeline
```
User Query → Embedding → Vector Search → Context Retrieval → LLM Generation → Response
```

---

# Thank You

---

*RAG System Implementation - Capstone Project*
