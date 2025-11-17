# Pinecone RAG Test CLI Usage Guide

## 🎯 Overview

The `test-pinecone-rag.js` script now supports three modes:
1. **Automated Tests** - Run all predefined test cases
2. **Manual Query** - Test a single query and evaluate manually
3. **Interactive Mode** - Ask multiple queries in a session

---

## 📋 Usage Examples

### 1. Run Automated Tests (Default)
```bash
node examples/test-pinecone-rag.js
```
Runs all 6 predefined test cases with strict quality scoring.

---

### 2. Test a Single Manual Query

#### With Flag
```bash
node examples/test-pinecone-rag.js --query "What is the botanical name of Haridra?"
node examples/test-pinecone-rag.js -q "How to manage anxiety with Ayurveda?"
```

#### Without Flag (Quick Query)
```bash
node examples/test-pinecone-rag.js "What herbs help with skin conditions?"
node examples/test-pinecone-rag.js "Tell me about Ashwagandha dosage and preparation"
```

**What it does:**
- Runs health check
- Executes your query against Pinecone RAG
- Shows full response with quality analysis
- Provides evaluation guide for manual assessment

---

### 3. Interactive Mode
```bash
node examples/test-pinecone-rag.js --interactive
node examples/test-pinecone-rag.js -i
```

**What it does:**
- Runs health check once
- Enters interactive prompt
- Ask multiple queries in the same session
- Type `exit` or `quit` to stop

**Example session:**
```
💬 Enter your Ayurvedic queries (type "exit" or "quit" to stop)

🔍 Your query: What is turmeric used for?
[... response and analysis ...]

🔍 Your query: How to prepare Brahmi?
[... response and analysis ...]

🔍 Your query: exit
👋 Goodbye!
```

---

### 4. Show Help
```bash
node examples/test-pinecone-rag.js --help
node examples/test-pinecone-rag.js -h
```

---

## 📊 Quality Analysis

For manual queries, the script provides:

### Automatic Metrics
- ✅ **Response length** - Should be 500+ characters
- ✅ **Citations** - Should have 3+ citations with page numbers
- ✅ **Vector search indicators** - Ayurvedic context present
- ✅ **Sanskrit terms** - Proper terminology used
- ✅ **Grounding phrases** - "According to", "based on", etc.
- ✅ **Botanical names** - Scientific names in parentheses
- ✅ **Dosha references** - Vata, Pitta, Kapha mentions
- ✅ **No refusals** - System answered confidently

### Quality Score
- **90-100%** - Excellent, production-ready
- **70-89%** - Good, minor improvements needed
- **50-69%** - Fair, needs work
- **<50%** - Poor, significant issues

---

## 🎯 Manual Evaluation Guide

When running manual queries, also check:

### 1. **Accuracy**
- [ ] Response directly answers your question
- [ ] Information is factually correct (cross-check with sources)
- [ ] Citations match the content being referenced

### 2. **Completeness**
- [ ] All aspects of the query are addressed
- [ ] Sufficient detail provided
- [ ] Related information included (e.g., dosage, preparation, contraindications)

### 3. **Grounding**
- [ ] Response is based on retrieved documents (not hallucinated)
- [ ] Sources are properly cited
- [ ] Grounding phrases like "according to" are used

### 4. **Ayurvedic Context**
- [ ] Sanskrit/botanical names included where appropriate
- [ ] Dosha considerations mentioned when relevant
- [ ] Traditional Ayurvedic principles respected
- [ ] Practical guidance provided (preparation, dosage, usage)

### 5. **Safety**
- [ ] Contraindications mentioned when applicable
- [ ] Recommends consulting practitioners for personalized advice
- [ ] Disclaimers about medical conditions

---

## 💡 Example Queries to Try

### Herb Properties
```bash
node examples/test-pinecone-rag.js "What is the botanical name of Haridra?"
node examples/test-pinecone-rag.js "Tell me about Ashwagandha properties"
node examples/test-pinecone-rag.js "What are the microscopic characteristics of Brahmi?"
```

### Skin Conditions
```bash
node examples/test-pinecone-rag.js "How to treat eczema with Ayurveda?"
node examples/test-pinecone-rag.js "Natural remedies for red skin rashes"
node examples/test-pinecone-rag.js "What herbs help with psoriasis?"
```

### Mental Health
```bash
node examples/test-pinecone-rag.js "How to manage anxiety using Ayurvedic herbs?"
node examples/test-pinecone-rag.js "What are Ayurvedic practices for stress relief?"
node examples/test-pinecone-rag.js "Tell me about Brahmi for memory"
```

### Dosage & Preparation
```bash
node examples/test-pinecone-rag.js "How should I prepare Ashwagandha?"
node examples/test-pinecone-rag.js "What is the correct dosage of turmeric?"
node examples/test-pinecone-rag.js "How to make Triphala decoction?"
```

### Cross-Domain Queries
```bash
node examples/test-pinecone-rag.js "What herbs help with both skin and mental health?"
node examples/test-pinecone-rag.js "Tell me about holistic treatment for stress and inflammation"
```

---

## 🔧 Troubleshooting

### Health Check Fails
```
❌ Pinecone system is not healthy.
```

**Solutions:**
1. Ensure `.env.local` has `PINECONE_API_KEY`
2. Verify Pinecone index exists: `ayurveda-knowledge`
3. Check dev server is running: `npm run dev`
4. Verify network connectivity to Pinecone

### No Response
```
❌ Query test failed: fetch failed
```

**Solutions:**
1. Start Next.js dev server: `npm run dev`
2. Check API endpoint is accessible: `http://localhost:3000/api/embedpinecone`
3. Verify port 3000 is not blocked

### Low Quality Score
```
⚠️  Quality score 60.0% is below 70% threshold
```

**Possible causes:**
- Vector search didn't find relevant chunks
- Query is too vague or off-topic
- LLM is generating content instead of quoting sources
- Missing citations or grounding phrases

**Try:**
- Rephrase query to be more specific
- Use Ayurvedic terminology in the query
- Check if topic is covered in the knowledge base

---

## 📝 Tips for Best Results

### Writing Good Queries

✅ **Good:**
```bash
"What is the botanical name and therapeutic properties of Haridra?"
"How to prepare Ashwagandha powder and what is the recommended dosage?"
"What are the Ayurvedic treatments for eczema including herbs and lifestyle?"
```

❌ **Avoid:**
```bash
"Tell me about herbs" (too vague)
"Is Ayurveda good?" (not specific)
"What should I do?" (no context)
```

### Using Interactive Mode Effectively

1. Start with broad queries, then narrow down
2. Reference previous answers in follow-up questions
3. Ask for specific aspects (dosage, preparation, contraindications)
4. Request clarification on Sanskrit terms
5. Ask about related herbs or conditions

---

## 🎓 Understanding the Output

### Response Headers
```
📊 Response Headers:
   - Vector DB: Pinecone         ← Confirms using Pinecone
   - Documents Found: 10         ← Number of chunks retrieved
   - Index Name: ayurveda-knowledge  ← Pinecone index name
```

### Citation Format
```
【Ayurvedic Pharmacopoeia Vol-1†Haridra†Page 71】
 ↑        ↑                      ↑       ↑
 │        │                      │       └─ Page number
 │        │                      └───────── Herb/topic name
 │        └──────────────────────────────── Source document
 └───────────────────────────────────────── Citation marker
```

### Quality Metrics
```
📊 Quality Score: 95/100 (95.0%)
   ↑           ↑    ↑      ↑
   │           │    │      └─ Percentage
   │           │    └──────── Out of max score
   │           └───────────── Points earned
   └───────────────────────── Overall quality
```

---

## 🚀 Quick Start Cheat Sheet

```bash
# Show help
node examples/test-pinecone-rag.js --help

# Run all tests
node examples/test-pinecone-rag.js

# Quick query
node examples/test-pinecone-rag.js "Your question here"

# Interactive mode
node examples/test-pinecone-rag.js -i

# Single query with flag
node examples/test-pinecone-rag.js -q "Your question here"
```

---

## 📚 Related Files

- `test-pinecone-rag.js` - Main test script
- `test-enhanced-rag.js` - Tests local JSON RAG (keyword-based)
- `QUICK_TEST_GUIDE.md` - Quick reference for both RAG systems
- `../docs/RAG_IMPLEMENTATIONS_COMPARISON.md` - Architectural comparison
