# Examples & Test Suite

This folder contains examples and test files for various RAG implementations and OpenAI embeddings.

## 📁 Files Overview

### RAG API Tests
1. **`test-enhanced-rag.js`** ⚡ - Tests local JSON-based RAG (`/api/ayurveda-enhanced`)
2. **`test-pinecone-rag.js`** ⭐ - Tests Pinecone vector database RAG (`/api/embedpinecone`)

### Embedding Examples
3. **`test-embedding.js`** - JavaScript embedding tests with OpenAI SDK
4. **`test-embedding.ts`** - TypeScript version with type safety
5. **`test-embedding-http.js`** - HTTP-based embedding tests

### Dependencies
6. **`package.json`** - Node.js dependencies for all examples

---

## 🎯 RAG Implementation Tests

### Test Local JSON RAG (Keyword-Based)
```bash
# Tests: /api/ayurveda-enhanced
node examples/test-enhanced-rag.js
```

**What it tests:**
- Local JSON file loading (3 datasets)
- Query classification and routing
- Keyword-based search
- Query expansion
- Relevance filtering

**No vector database required** ⚡

---

### Test Pinecone Vector RAG (Semantic Search) ⭐
```bash
# Tests: /api/embedpinecone
node examples/test-pinecone-rag.js
```

**What it tests:**
- Pinecone health and connectivity
- Vector similarity search
- Multi-namespace queries (5 namespaces)
- Semantic understanding
- Citation generation
- Response header validation

**Requires Pinecone credentials** in `.env.local`:
```
PINECONE_API_KEY=your_key_here
PINECONE_INDEX_NAME=ayurveda-knowledge
PINECONE_ENVIRONMENT=us-east-1-aws
```

---

## 🔧 Setup

1. Make sure you have a `.env.local` file in the parent directory:
   ```env
   OPENAI_API_KEY=your_api_key_here
   
   # For Pinecone RAG tests only:
   PINECONE_API_KEY=your_pinecone_key
   PINECONE_INDEX_NAME=ayurveda-knowledge
   PINECONE_ENVIRONMENT=us-east-1-aws
   ```

2. Install dependencies (from the examples folder):
   ```bash
   cd examples
   npm install
   ```

3. Start the Next.js dev server (required for RAG tests):
   ```bash
   cd ..
   npm run dev
   ```

---

## 🚀 Running the Tests

### RAG API Tests (Require Dev Server)
```bash
# Local JSON RAG (keyword-based)
node test-enhanced-rag.js

# Pinecone Vector RAG (semantic search)
node test-pinecone-rag.js
```

### Embedding Examples (Standalone)
```bash
# JavaScript version
node test-embedding.js

# TypeScript version
npx tsx test-embedding.ts

# HTTP version
node test-embedding-http.js
```

---

## 📊 What These Examples Demonstrate

### RAG Tests

#### `test-enhanced-rag.js` (Local JSON RAG)
- Multi-dataset querying
- Query classification
- Keyword matching and scoring
- Response analysis (citations, grounding)
- No external dependencies

#### `test-pinecone-rag.js` (Vector Database RAG) ⭐
- Pinecone health checks
- Vector similarity search
- Multi-namespace architecture
- Semantic query understanding
- Citation metadata validation
- Production-ready testing

### Embedding Examples

#### `test-embedding.js` (JavaScript)
- Single text embedding
- Batch text embeddings
- Long text handling
- API response analysis
- Token usage tracking
- Error handling

### TypeScript Version (`test-embedding.ts`)
- Type-safe embedding creation
- Embedding vector analysis (min, max, average values)
- Cosine similarity calculations
- Similarity comparison between texts
- Structured error handling
- Reusable utility functions

## Expected Output

Both examples will show:
- ⏱️ API call duration
- 💰 Token usage and costs
- 🔢 Embedding dimensions (1536 for ada-002)
- 🎯 Sample embedding values
- 📊 Statistical analysis of embeddings
- 🔍 Similarity comparisons (TypeScript version)

## Learning Objectives

1. **Understanding Embeddings**: See how text is converted to numerical vectors
2. **API Usage**: Learn the OpenAI embeddings API structure
3. **Batch Processing**: Compare single vs. batch embedding creation
4. **Performance**: Monitor API call times and token usage
5. **Similarity**: Understand how similar texts have similar embeddings
6. **Error Handling**: Proper error management for API calls

## Common Use Cases

- Semantic search
- Document similarity
- Content clustering
- Recommendation systems
- Text classification
- RAG (Retrieval Augmented Generation) systems

## Notes

- The ada-002 model produces 1536-dimensional embeddings
- Embeddings are normalized (cosine similarity range: -1 to 1)
- Batch processing is more efficient for multiple texts
- Consider rate limits and API costs for production use