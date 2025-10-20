# Advanced RAG Application with MinerU + LangChain + Next.js

## Architecture Overview

Production-ready RAG system for Ayurvedic medicine knowledge base, evolved from Dave Gray's tutorial. Features advanced PDF processing with MinerU and multiple implementation patterns:

- **`api/chat`**: Basic OpenAI integration using Vercel AI SDK
- **`api/ex1-ex4`**: Progressive LangChain examples (basic → memory → full RAG)
- **`api/ayurveda`**: Production RAG with MinerU-processed Ayurvedic data
- **`api/embedyurveda`**: Vector store RAG with Chroma/MemoryVectorStore
- **`scripts/`**: MinerU PDF processing pipeline for data generation

## Key Components & Data Pipeline

### MinerU Document Processing (`scripts/pdf_to_json_mineru_enhanced.py`)
Advanced PDF parsing pipeline that creates structured RAG data:
```python
# Creates ayurcheck_rag.json with 220+ text chunks from 241-page PDF
# Preserves document structure: sections, tables, formulas, images
```

### Production RAG Implementation (`api/ayurveda/route.ts`)
Loads pre-processed Ayurvedic data with structured metadata:
```typescript
interface RAGChunk {
  id: string; text: string; type: string;
  section?: string; subsection?: string; 
  bbox?: number[]; page?: number;
}
```

### Vector Store Integration (`api/embedyurveda/route.ts` + `lib/vector-store.ts`)
Supports both Chroma and in-memory vector stores with Ayurveda-specific metadata:
```typescript
interface AyurvedaMetadata {
  herb_name?: string; botanical_name?: string;
  dosha_type?: "vata" | "pitta" | "kapha" | "tridosha";
  category: "remedy" | "herb" | "lifestyle" | "diagnosis" | "pharmacopoeia";
}
```

## Critical Development Workflows

### MinerU PDF Processing Pipeline
Generate new RAG data from PDFs using the enhanced MinerU pipeline:
```bash
# One-time setup: Download MinerU models (required)
mineru-models-download  # Downloads ~6.4GB models, creates C:\Users\vinit\mineru.json

# Process PDFs with downloaded models
cd scripts
python pdf_to_json_mineru_enhanced.py input.pdf output.json
python mineru_to_rag.py output.json  # Creates RAG-ready files

# Config location: C:\Users\vinit\mineru.json (auto-detected by script)
# Models location: ~/.cache/huggingface/hub/
```

### Environment Setup & Testing
```bash
# Required environment
echo "OPENAI_API_KEY=your_key" >> .env.local

# Test different RAG implementations
npm run dev
# Visit /ayurveda for production RAG or switch useChat api in chat.tsx
```

### Vector Store Configuration
Toggle between Chroma (persistent) and MemoryVectorStore via `lib/vector-store.ts`:
```typescript
const config = { 
  useVectorDB: true,           // Enable vector similarity search
  vectorDBType: 'chroma'       // or 'memory' for in-process
};
```

## Data Architecture & Formats

### Multi-Format Data Pipeline 
All data exists in 3 formats (see `src/data/` and `INTEGRATION_GUIDE.md`):
- **`.json`**: Structured data for Next.js API routes
- **`.jsonl`**: Line-delimited for vector database ingestion  
- **`.md`**: Human-readable documentation format

### Ayurvedic Knowledge Structure
MinerU preserves semantic document structure:
```typescript
// 220 text chunks from 241-page Ayurvedic Pharmacopoeia
// Content types: text (212), tables (2), formulas (6), images (9)
// Avg chunk size: 1,128 characters with source attribution
```

## Critical Implementation Patterns

1. **All API routes must export `dynamic = 'force-dynamic'`** for proper streaming
2. **Runtime selection**: Use `export const runtime = 'edge'` for pages, Node.js for API routes requiring `fs`
3. **Error handling**: Return `Response.json({ error: e.message }, { status: e.status ?? 500 })`
4. **LangChain chains**: Always use `streaming: true` and `RunnableSequence.from()` pattern
5. **Vector search**: Use `similaritySearchWithScore()` with relevance thresholds (0.7+ typical)

## Production Considerations

### MinerU Processing Requirements
- **One-time model download**: Run `mineru-models-download` (~6.4GB, downloads to `~/.cache/huggingface/hub/`)
- **Configuration**: Stored at `C:\Users\vinit\mineru.json` (Windows) or `~/.mineru.json` (Linux/Mac)
- **Processing time**: ~25 minutes for 241-page PDF on first run, faster on subsequent runs
- **System requirements**: 16GB+ RAM, 20GB+ disk space for models and processing

### API Route Performance
- **ayurveda/**: In-memory JSON loading, fast startup, 220 chunks searched
- **embedyurveda/**: Vector similarity search, slower first request, semantic retrieval
- Use HTTP request interceptors in `embedyurveda/route.ts` for OpenAI API monitoring

## Integration Points

- **Vercel AI SDK**: Streaming responses and chat state management
- **LangChain**: Document processing, vector stores, and RAG orchestration
- **MinerU**: Advanced PDF parsing with structure preservation (tables, formulas)  
- **Chroma/MemoryVectorStore**: Vector similarity search with metadata filtering
- **shadcn/ui**: Accessible components with Tailwind CSS integration