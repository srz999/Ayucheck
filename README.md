# Advanced RAG A# Advanced RAG Application with MinerU + LangChain + Next.js

## 🌟 Complete PDF-to-RAG Pipeline for Ayurvedic Medicine

This project demonstrates a state-of-the-art Retrieval Augmented Generation (RAG) system that converts complex PDFs into intelligent, searchable knowledge bases using MinerU's advanced document parsing and LangChain's powerful RAG capabilities.

### 🎯 Project Overview

Built as an advanced extension of Dave Gray's RAG tutorial, this system showcases real-world PDF processing using MinerU (a state-of-the-art document parsing system) to create a production-ready Ayurvedic medicine knowledge base.

## ⚡ Key Features

- **🔬 Advanced PDF Parsing**: Uses MinerU 2.5.4 for intelligent document structure recognition
- **📖 Ayurvedic Knowledge Base**: Complete Ayurvedic Pharmacopoeia Vol-1 with 220+ text chunks
- **🤖 Intelligent RAG**: Context-aware responses with source attribution  
- **💬 Modern Chat Interface**: Streaming responses with beautiful UI
- **🔧 Multiple Integration Options**: API routes, Python scripts, and deployment examples
- **🏗️ Production Ready**: Error handling, streaming, multiple output formats

## 📊 Project Statistics

```
📄 Source Document: AyurCheck API Vol-1 (681 KB PDF)
🔢 Total Pages: 241 pages processed
📝 Text Chunks: 220 RAG-ready chunks (avg 1,128 chars)
🏛️ Content Types: Text (212), Tables (2), Formulas (6), Images (9)
⚡ Processing Time: ~25 minutes (includes model downloads)
💾 Output Formats: JSON, JSONL, Markdown
```

---

### 🙏 Acknowledgments

This project builds upon Dave Gray's excellent RAG tutorial foundations:

📚 [Dave Gray's Courses](https://courses.davegray.codes/)  
✅ [YouTube Channel](https://www.youtube.com/DaveGrayTeachesCode)  
📺 [Original RAG Tutorial](https://youtu.be/YLagvzoWCL0)ion with MinerU + LangChain + Next.js

## 🌟 Complete PDF-to-RAG Pipeline for Ayurvedic Medicine

This project demonstrates a state-of-the-art Retrieval Augmented Generation (RAG) system that converts complex PDFs into intelligent, searchable knowledge bases using MinerU's advanced document parsing and LangChain's powerful RAG capabilities.

## ⚡ Key Features

- **🔬 Advanced PDF Parsing**: Uses MinerU 2.5.4 for intelligent document structure recognition
- **📖 Ayurvedic Knowledge Base**: Complete Ayurvedic Pharmacopoeia Vol-1 with 220+ text chunks
- **🤖 Intelligent RAG**: Context-aware responses with source attribution  
- **💬 Modern Chat Interface**: Streaming responses with beautiful UI
- **🔧 Multiple Integration Options**: API routes, Python scripts, and deployment examples

## 📊 Project Statistics

```
� Source Document: AyurCheck API Vol-1 (681 KB PDF)
🔢 Total Pages: 241 pages processed
📝 Text Chunks: 220 RAG-ready chunks (avg 1,128 chars)
🏛️ Content Types: Text (212), Tables (2), Formulas (6), Images (9)
⚡ Processing Time: ~25 minutes (includes model downloads)
```

---

### Original Tutorial by Dave Gray

👋 This builds upon Dave Gray's excellent RAG tutorial.

📚 [My Courses](https://courses.davegray.codes/)  
✅ [YouTube Channel](https://www.youtube.com/DaveGrayTeachesCode)  
🚩 [Subscribe](https://bit.ly/3nGHmNn) | 💖 [Support](https://patreon.com/davegray)  
🚀 Follow: [Twitter](https://twitter.com/yesdavidgray) | [LinkedIn](https://www.linkedin.com/in/davidagray/)

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Clone and install
git clone <your-repo>
cd nextjs-rag-langchain
npm install

# Setup OpenAI API key
echo "OPENAI_API_KEY=your_openai_key_here" >> .env.local
```

### 2. Run the RAG Application

```bash
# Start the development server  
npm run dev

# Visit the applications
open http://localhost:3000          # Basic examples
open http://localhost:3000/ayurveda # Ayurvedic RAG Chat
```

### 3. Explore Example RAG Implementations

- **`/api/chat`** - Basic OpenAI integration
- **`/api/ex1-ex3`** - Progressive LangChain examples  
- **`/api/ex4`** - US States JSON RAG example
- **`/api/ayurveda`** - Advanced MinerU-powered Ayurvedic RAG
- **`/api/graphrag`** - Graph RAG with knowledge graph ⭐ NEW

### 4. Access the Applications

```bash
# Traditional vector-based RAG
open http://localhost:3000/ayurveda

# Graph RAG with entity/relationship extraction
open http://localhost:3000/graphrag
```

## 📚 MinerU PDF Processing Pipeline

### Overview
This project showcases an advanced PDF-to-RAG conversion using MinerU, a state-of-the-art document parsing system that provides:

- **Layout Recognition**: Intelligent document structure analysis
- **Table Extraction**: Preserves complex table formatting  
- **Formula Recognition**: OCR for mathematical expressions
- **Image Extraction**: Automatic image detection and extraction
- **Multi-language Support**: Handles diverse text content

### Processing Scripts

#### 1. PDF to MinerU JSON (`scripts/pdf_to_json_mineru_enhanced.py`)

```python
# Advanced PDF converter with virtual environment support
python scripts/pdf_to_json_mineru_enhanced.py

# Converts: AyurCheck_API-Vol-1.pdf → ayurcheck_mineru_output.json
# Features: Real-time output, timeout handling, virtual env detection
```

#### 2. MinerU to RAG Format (`scripts/mineru_to_rag.py`)

```python  
# Convert MinerU JSON to RAG-friendly formats
python scripts/mineru_to_rag.py src/data/ayurcheck_mineru_output.json -o ayurcheck

# Generates:
# - ayurcheck_rag.json    (Web app format)
# - ayurcheck_rag.jsonl   (Vector DB format)  
# - ayurcheck_rag.md      (Human readable)
```

#### 3. LangChain Integration (`scripts/langchain_rag_example.py`)

```python
# Complete LangChain RAG system example
export OPENAI_API_KEY="your_key_here"
python scripts/langchain_rag_example.py

# Features: Document loading, embeddings, retrieval chains, interactive queries
```

## 🏗️ Architecture Deep Dive

### RAG Data Structure

The conversion pipeline creates a structured format optimized for RAG applications:

```json
{
  "source": "AyurCheck_API-Vol-1.pdf",
  "title": "Ayurvedic Pharmacopoeia of India",
  "total_pages": 241,
  "total_chunks": 220,
  "pages": {
    "page_1": {
      "page_number": 1,
      "chunks": [
        {
          "id": "page_1_chunk_1", 
          "text": "Clean, processed text content...",
          "type": "text|table|formula",
          "section": "Chapter heading",
          "subsection": "Subheading",
          "bbox": [x, y, width, height]
        }
      ]
    }
  },
  "extraction_stats": {
    "text_chunks": 212,
    "table_chunks": 2, 
    "formula_chunks": 6
  }
}
```

### API Architecture

The Next.js API routes demonstrate different RAG complexity levels:

```typescript
// Basic chat (api/chat/route.ts)
OpenAI SDK → Direct streaming

// Progressive examples (api/ex1-ex3/route.ts)  
LangChain → Memory → Personality prompts

// JSON RAG (api/ex4/route.ts)
JSONLoader → Context injection → Streaming

// Advanced RAG (api/ayurveda/route.ts)
MinerU data → Smart search → Context formatting → Streaming ⭐
```

## 💡 Key Innovations

### 1. **Advanced Document Processing**
- Uses MinerU's layout recognition instead of basic text extraction
- Preserves document structure (headings, tables, formulas)
- Maintains spatial information with bounding boxes

### 2. **Smart RAG Search**  
- Content-aware chunk scoring based on query relevance
- Section and title boosting for better context
- Multi-type content handling (text, tables, formulas)

### 3. **Production-Ready Architecture**
- Streaming responses for better UX
- Error handling and timeout management  
- Multiple output formats for different use cases
- Virtual environment support for modern Python setups

## 📖 Example Queries

Try these with the Ayurvedic RAG system:

```
🌿 "What is Ajagandha and its therapeutic uses?"
🌿 "Tell me about Amalaki preparation methods" 
🌿 "How should Guggulu be processed and what is the dosage?"
🌿 "Quality control standards for Ayurvedic drugs"
🌿 "Traditional treatment for digestive disorders"
```

## 🔧 Development Notes

### MinerU Setup Requirements
- Python 3.8+ (tested with 3.13.2)
- Virtual environment recommended for externally managed systems
- ~2GB download for OCR models on first run
- CUDA optional (CPU processing supported)

### Next.js Configuration  
- Edge runtime enabled for optimal streaming
- Dynamic force enabled for all API routes
- Vercel AI SDK for chat state management
- TailwindCSS + shadcn/ui for modern styling

---

### Original Tutorial Reference

📺 [Dave Gray's RAG Tutorial](https://youtu.be/YLagvzoWCL0) - Base implementation  
📚 [Course Materials](https://courses.davegray.codes/) - Learn the fundamentals

### 🎓 Academic Honesty

**DO NOT COPY FOR AN ASSIGNMENT** - Avoid plagiarism and adhere to the spirit of this [Academic Honesty Policy](https://www.freecodecamp.org/news/academic-honesty-policy/).

---

### 📚 Tutorial References

- 🔗 [LangChain JS/TS Docs](https://js.langchain.com/docs/get_started/introduction)
- 🔗 [Next.js](https://nextjs.org/)
- 🔗 [Vercel AI SDK](https://sdk.vercel.ai/docs)
- 🔗 [OpenAI](https://openai.com/)
- 🔗 [shadcn/ui](https://ui.shadcn.com/)
- 🔗 [Next.js Light & Dark Modes](https://www.davegray.codes/posts/light-dark-mode-nextjs-app-router-tailwind)