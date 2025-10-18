# OpenAI Embedding Examples

This folder contains learning examples for working with OpenAI embeddings using the plain OpenAI SDK.

## Files

1. **`test-embedding.js`** - JavaScript version with comprehensive embedding tests
2. **`test-embedding.ts`** - TypeScript version with type safety and similarity analysis
3. **`package.json`** - Dependencies for running the examples

## Setup

1. Make sure you have a `.env.local` file in the parent directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

2. Install dependencies (from the examples folder):
   ```bash
   cd examples
   npm install
   ```

## Running the Examples

### JavaScript Version
```bash
# From the examples folder
node test-embedding.js

# Or using npm script
npm run test-js
```

### TypeScript Version
```bash
# From the examples folder
npx tsx test-embedding.ts

# Or using npm script
npm run test-ts
```

## What These Examples Demonstrate

### JavaScript Version (`test-embedding.js`)
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