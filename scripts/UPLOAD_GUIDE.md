# Upload Data to Pinecone - Guide

## Prerequisites

1. ✅ Pinecone API Key in `.env.local`
2. ✅ OpenAI API Key in `.env.local`
3. ✅ Pinecone index created (run `node create-pinecone-index.js` if not)

## Upload Commands

### Upload Skin Diseases Data Only
```bash
node scripts/upload-to-pinecone.js skin
```

### Upload Mental Disorders Data Only
```bash
node scripts/upload-to-pinecone.js mental
```

### Upload Both Datasets
```bash
node scripts/upload-to-pinecone.js both
```

## What the Script Does

1. **Loads JSONL files** from `src/data/`
2. **Generates embeddings** using OpenAI's `text-embedding-3-small` model (1536 dimensions)
3. **Uploads vectors** to Pinecone in batches of 100
4. **Organizes data** into namespaces:
   - `skin-diseases` - For skin disease data
   - `mental-disorders` - For mental health data

## Data Structure

Each vector stored in Pinecone contains:
- **ID**: Unique chunk identifier (e.g., `chunk_0`, `chunk_3_5_7`)
- **Values**: 1536-dimensional embedding vector
- **Metadata**:
  - `text`: The actual text content
  - `type`: Type of content (text/table)
  - `page`: Page number from source document
  - `section`: Section name (if any)
  - `subsection`: Subsection name (if any)
  - `bbox`: Bounding box coordinates (JSON string)

## Expected Output

```
✅ Loaded environment variables from .env.local
🚀 Starting Pinecone upload process...
📋 Index: ayurveda-knowledge
🔍 Checking Pinecone index...
✅ Index 'ayurveda-knowledge' found!

============================================================
📄 Processing: Skin Diseases Data
============================================================
📂 Loading data from: .../src/data/ayu_skinDiseases_rag.jsonl
✅ Loaded 48 chunks

📤 Uploading 48 vectors to Pinecone...
📍 Namespace: skin-diseases

🤖 Generating embeddings...
  🔄 Generating embeddings for items 1-20...
  🔄 Generating embeddings for items 21-40...
  🔄 Generating embeddings for items 41-48...
✅ Generated 48 embeddings

📤 Uploading vectors to Pinecone...
  ⬆️  Uploading batch 1/1 (48 vectors)...
  ✅ Uploaded 48/48 vectors

✅ Successfully uploaded 48 vectors!

📊 Checking index stats...
Index stats: {
  "namespaces": {
    "skin-diseases": { "vectorCount": 48 }
  },
  "dimension": 1536,
  "indexFullness": 0.00001,
  "totalVectorCount": 48
}

============================================================
🎉 Upload completed successfully!
============================================================
```

## Troubleshooting

### Error: Index not found
**Solution**: Create the index first
```bash
node create-pinecone-index.js
```

### Error: API Key not found
**Solution**: Check your `.env.local` file contains:
```env
PINECONE_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
PINECONE_INDEX_NAME=ayurveda-knowledge
```

### Error: Rate limit exceeded
**Solution**: The script has built-in delays. If you still hit limits, increase the delay values in the script.

### Error: Embedding generation failed
**Solution**: Check your OpenAI API key and account credits.

## Verify Upload

Check your Pinecone dashboard at: https://app.pinecone.io

Or use the test script:
```bash
node test-pinecone-connection.js
```

## Query the Data

Once uploaded, you can query using the embedding API route or the chatbot interface at:
- `/embeddingpinecone` - Pinecone-powered chat interface

## Notes

- The script uses namespaces to separate different datasets
- Embeddings are cached at OpenAI's side for efficiency
- Batch processing helps avoid rate limits
- Each chunk maintains its original metadata for context
