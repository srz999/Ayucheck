# Ayurvedic RAG Integration Guide

## 🎯 Complete Integration Examples

Your Ayurvedic RAG system is now ready! Here are practical integration examples.

## 📂 Files Generated

### 1. RAG Data Files (in `src/data/`)
- **`ayurcheck_rag.json`** - Structured JSON for web applications
- **`ayurcheck_rag.jsonl`** - Line-delimited JSON for vector databases  
- **`ayurcheck_rag.md`** - Human-readable markdown format

### 2. Integration Scripts (in `scripts/`)
- **`langchain_rag_example.py`** - Complete LangChain integration
- **`mineru_to_rag.py`** - RAG conversion pipeline

### 3. Next.js API Route
- **`src/app/api/ayurveda/route.ts`** - RAG-powered API endpoint

### 4. Updated Components  
- **`src/app/components/ayurvedic-chat.tsx`** - RAG-enabled chat interface

## 🚀 Quick Start

### 1. Test the Next.js RAG Chat

```bash
# Make sure you have your OpenAI API key
echo "OPENAI_API_KEY=your_key_here" >> .env.local

# Start the development server
npm run dev
```

Navigate to: `http://localhost:3000/ayurveda`

### 2. Test Python LangChain Integration

```bash
# Install required packages
pip install langchain langchain-community langchain-openai faiss-cpu

# Set your API key
export OPENAI_API_KEY="your_key_here"

# Run the example
cd scripts
python langchain_rag_example.py
```

## 🔧 Integration Examples

### A. Vector Database Integration

```python
# Example: Using with Chroma Vector DB
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
import json

# Load RAG data
with open("../src/data/ayurcheck_rag.json", "r") as f:
    rag_data = json.load(f)

# Extract documents
documents = []
for page_key, page_data in rag_data["pages"].items():
    for chunk in page_data["chunks"]:
        documents.append({
            "content": chunk["text"],
            "metadata": {
                "page": page_data["page_number"],
                "section": chunk.get("section", ""),
                "type": chunk["type"]
            }
        })

# Create embeddings and store
embeddings = OpenAIEmbeddings()
vectorstore = Chroma.from_texts(
    texts=[doc["content"] for doc in documents],
    metadatas=[doc["metadata"] for doc in documents],
    embedding=embeddings,
    persist_directory="./ayurveda_db"
)
```

### B. FastAPI Integration

```python
from fastapi import FastAPI
from pydantic import BaseModel
import json
from typing import List

app = FastAPI(title="Ayurvedic RAG API")

# Load RAG data at startup
with open("ayurcheck_rag.json", "r") as f:
    rag_data = json.load(f)

class QueryRequest(BaseModel):
    question: str
    max_results: int = 5

class QueryResponse(BaseModel):
    answer: str
    sources: List[dict]
    confidence: float

@app.post("/query", response_model=QueryResponse)
async def query_ayurveda(request: QueryRequest):
    # Your RAG logic here
    relevant_chunks = search_chunks(request.question)
    answer = generate_answer(request.question, relevant_chunks)
    
    return QueryResponse(
        answer=answer,
        sources=relevant_chunks,
        confidence=0.85
    )
```

### C. Streamlit App Integration

```python
import streamlit as st
import json
from langchain_openai import ChatOpenAI

st.title("🌿 Ayurvedic Knowledge Explorer")

# Load RAG data
@st.cache_data
def load_rag_data():
    with open("ayurcheck_rag.json", "r") as f:
        return json.load(f)

rag_data = load_rag_data()

# Sidebar with stats
st.sidebar.metric("Total Pages", rag_data["total_pages"])
st.sidebar.metric("Total Chunks", rag_data["total_chunks"])
st.sidebar.metric("Text Chunks", rag_data["extraction_stats"]["text_chunks"])

# Main chat interface
question = st.text_input("Ask about Ayurvedic herbs and remedies:")

if question:
    # Search and respond logic
    relevant_chunks = search_chunks(question, rag_data)
    answer = generate_answer(question, relevant_chunks)
    
    st.markdown(f"**Answer:** {answer}")
    
    with st.expander("Sources"):
        for chunk in relevant_chunks:
            st.write(f"Page {chunk['page']}: {chunk['text'][:200]}...")
```

## 📊 Data Statistics

Your converted RAG data contains:

```json
{
  "total_pages": 241,
  "total_chunks": 220,
  "extraction_stats": {
    "text_chunks": 212,
    "table_chunks": 2,
    "formula_chunks": 6,
    "average_chunk_length": 1128
  }
}
```

## 🔍 Search Capabilities

The RAG system can answer questions about:

### **Herbs & Plants**
- "What is Ajagandha and its therapeutic uses?"
- "Tell me about Amalaki properties and preparation"
- "How should Guggulu be processed?"

### **Medical Conditions**
- "Ayurvedic treatment for digestive disorders"
- "Traditional remedies for respiratory conditions"  
- "Herbs for mental health and stress"

### **Preparation Methods**
- "How to prepare Ayurvedic formulations?"
- "Dosage guidelines for specific herbs"
- "Quality control standards"

## 🎛️ Advanced Configuration

### Custom Chunking Strategy

```python
# Modify mineru_to_rag.py for different chunk sizes
CHUNK_TARGET_SIZE = 800  # Smaller chunks for better precision
CHUNK_OVERLAP = 100      # Overlap for context preservation
```

### Enhanced Search Algorithm

```typescript
// In your Next.js API route
function searchRelevantChunks(query: string, maxChunks = 8) {
  // Add semantic similarity scoring
  // Include fuzzy matching for Sanskrit terms  
  // Weight title and section matches higher
}
```

## 🔗 Integration Checklist

- [ ] ✅ MinerU PDF conversion completed
- [ ] ✅ RAG format conversion completed  
- [ ] ✅ Next.js API route created
- [ ] ✅ Chat interface updated
- [ ] ⏳ Set OpenAI API key in `.env.local`
- [ ] ⏳ Test the chat interface
- [ ] ⏳ Deploy to production
- [ ] ⏳ Add vector database (optional)
- [ ] ⏳ Implement user authentication (optional)

## 🚀 Next Steps

1. **Test the System**: Visit `/ayurveda` and try the example questions
2. **Add Vector Database**: Implement Chroma/Pinecone for better search
3. **Enhance UI**: Add herb images, Sanskrit pronunciation guides
4. **Mobile App**: Use the API to build a React Native/Flutter app
5. **Analytics**: Track popular queries and improve responses

## 🆘 Troubleshooting

### Common Issues:

**"RAG data not found"**
```bash
# Ensure the conversion completed
ls -la src/data/ayurcheck_rag.json
```

**"OpenAI API error"**  
```bash
# Check your API key
echo $OPENAI_API_KEY
```

**"No relevant chunks found"**
- Try more specific herb names
- Use Sanskrit terms (e.g., "Amalaki" instead of "Indian Gooseberry")
- Check for typos in plant names

## 📚 Resources

- [Ayurvedic Pharmacopoeia PDF](src/data/AyurCheck_API-Vol-1.pdf)
- [MinerU Documentation](https://github.com/opendatalab/MinerU)
- [LangChain Integration Guide](https://python.langchain.com/docs/)
- [Next.js AI SDK](https://sdk.vercel.ai/docs)

---

Your complete PDF-to-RAG pipeline is ready for production use! 🎉