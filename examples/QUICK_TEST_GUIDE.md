# Quick Test Guide

## 🎯 Which Test Should I Run?

### Testing Local JSON RAG (No Vector DB)
**File:** `test-enhanced-rag.js`  
**Endpoint:** `/api/ayurveda-enhanced`  
**What it is:** Keyword-based RAG with local JSON files

```bash
npm run dev
node examples/test-enhanced-rag.js
```

✅ **Use this when:**
- Testing without Pinecone
- Prototyping locally
- No internet/cloud required
- Fast iteration needed

---

### Testing Pinecone Vector RAG (Production)
**File:** `test-pinecone-rag.js` ⭐  
**Endpoint:** `/api/embedpinecone`  
**What it is:** True vector database with semantic search

```bash
# 1. Add to .env.local:
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=ayurveda-knowledge

# 2. Run tests
npm run dev
node examples/test-pinecone-rag.js
```

✅ **Use this when:**
- Testing production RAG
- Validating vector search
- Testing semantic similarity
- Verifying citations
- Testing multi-namespace queries

---

## 🔍 Quick Comparison

| Feature | Local JSON RAG | Pinecone Vector RAG |
|---------|----------------|---------------------|
| **Test File** | `test-enhanced-rag.js` | `test-pinecone-rag.js` |
| **Endpoint** | `/api/ayurveda-enhanced` | `/api/embedpinecone` |
| **Search Type** | Keyword matching | Vector similarity |
| **External Deps** | None | Pinecone API |
| **Setup Time** | Instant | ~30 seconds (first run) |
| **Semantic Search** | ❌ No | ✅ Yes |
| **Citations** | Basic | Rich metadata |
| **Namespaces** | 3 datasets | 5 namespaces |
| **Production Ready** | Dev/Prototype | ✅ Yes |

---

## 🚨 Common Mistakes

### ❌ WRONG: Testing the wrong endpoint
```javascript
// In test-enhanced-rag.js
const API_URL = 'http://localhost:3000/api/embedpinecone'; // WRONG!
```

### ✅ CORRECT: Each test targets its own endpoint
```javascript
// test-enhanced-rag.js
const API_URL = 'http://localhost:3000/api/ayurveda-enhanced';

// test-pinecone-rag.js
const API_URL = 'http://localhost:3000/api/embedpinecone';
```

---

## 📈 Expected Test Results

### Local JSON RAG (`test-enhanced-rag.js`)
```
✅ Health Check Response:
{
  "status": "healthy",
  "version": "enhanced-v1",
  "features": {
    "multiDataset": true,
    "queryClassification": true,
    "hybridSearch": true
  }
}

📊 Response Analysis:
   - Length: 1250 characters
   - Citations found: 0-2 (basic)
   - Contains Sanskrit terms: Maybe
   - Grounding phrases: Yes
```

### Pinecone Vector RAG (`test-pinecone-rag.js`)
```
✅ Pinecone is healthy with 220 vectors
📍 Index: ayurveda-knowledge
📊 Dimension: 1536

📊 Response Headers:
   - Vector DB: Pinecone ✓
   - Documents Found: 8
   - Index Name: ayurveda-knowledge

📊 Pinecone RAG Response Analysis:
   ✓ Length: 1800 characters
   ✓ Citations found: 3-5
   ✓ Vector search indicators: Yes
   ✓ Contains Sanskrit terms: Yes
   ✓ Expected features matched: 80%
```

---

## 🎓 When to Use Each

### Use Local JSON RAG when:
- 🚀 Quick prototyping
- 💰 Cost-sensitive (no external APIs)
- 🔒 Offline requirements
- 🧪 Testing query classification logic
- 📚 Small dataset (<10MB)

### Use Pinecone Vector RAG when:
- 🏭 Production deployment
- 🎯 Need semantic understanding
- 📈 Large dataset (>100MB)
- 🔍 Complex similarity queries
- 🌐 Multi-namespace architecture
- 📊 Citation requirements

---

## 🔧 Troubleshooting

### Local JSON RAG Issues
```bash
# If health check fails
✗ Check: src/data/ayurcheck_rag.json exists
✗ Check: src/data/ayu_skinDiseases_rag.json exists
✗ Check: src/data/ayu_mentalDisorders_rag.json exists

# Fix: Ensure all RAG JSON files are present
ls src/data/*.json
```

### Pinecone Vector RAG Issues
```bash
# If health check fails
✗ Check: PINECONE_API_KEY in .env.local
✗ Check: Pinecone index exists
✗ Check: Index has vectors (vectorCount > 0)

# Fix: Verify Pinecone credentials
curl -H "Api-Key: $PINECONE_API_KEY" \
  https://api.pinecone.io/indexes
```

---

## 📝 Summary

1. **`test-enhanced-rag.js`** → Tests local keyword-based RAG
2. **`test-pinecone-rag.js`** → Tests Pinecone vector RAG ⭐

**Always run the test that matches your target endpoint!**
