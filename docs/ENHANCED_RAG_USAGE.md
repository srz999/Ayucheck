# Enhanced RAG Usage Guide

## Quick Start

### 1. Prerequisites

Ensure you have:
- Node.js 18+ installed
- OpenAI API key set in `.env.local`
- At least one of the RAG datasets in `src/data/`:
  - `ayurcheck_rag.json` (Pharmacopoeia)
  - `ayu_skinDiseases_rag.json` (Skin diseases)
  - `ayu_mentalDisorders_rag.json` (Mental disorders)

### 2. Environment Setup

```bash
# Copy environment template
cp .env.local.example .env.local

# Edit and add your OpenAI API key
echo "OPENAI_API_KEY=your_key_here" >> .env.local
```

### 3. Start the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Access the Enhanced RAG API

The enhanced RAG endpoint is available at:
- **POST** `http://localhost:3000/api/ayurveda-enhanced` - Chat endpoint
- **GET** `http://localhost:3000/api/ayurveda-enhanced` - Health check

## API Usage

### Health Check

Check if the system is running and see dataset information:

```bash
curl http://localhost:3000/api/ayurveda-enhanced
```

**Response**:
```json
{
  "status": "healthy",
  "version": "enhanced-v1",
  "features": {
    "multiDataset": true,
    "queryClassification": true,
    "hybridSearch": true,
    "queryExpansion": true,
    "relevanceFiltering": true,
    "groundingValidation": true
  },
  "datasets": {
    "datasets": 3,
    "total_chunks": 450,
    "dataset_names": [
      "ayurcheck_rag.json",
      "ayu_skinDiseases_rag.json",
      "ayu_mentalDisorders_rag.json"
    ]
  }
}
```

### Chat Request

Send a query to get Ayurvedic advice:

```bash
curl -X POST http://localhost:3000/api/ayurveda-enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "What helps with red skin rashes?"
      }
    ]
  }'
```

**With conversation history**:
```bash
curl -X POST http://localhost:3000/api/ayurveda-enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Tell me about Vicaracika"
      },
      {
        "role": "assistant",
        "content": "Vicaracika is a Pitta-dominant skin disorder..."
      },
      {
        "role": "user",
        "content": "What is the treatment?"
      }
    ]
  }'
```

## Testing

### Automated Tests

Run the test script to verify functionality:

```bash
node examples/test-enhanced-rag.js
```

This will test:
- Health check endpoint
- Various query types (skin, mental, herb, general)
- Response quality analysis

### Manual Testing Queries

Try these queries to test different features:

#### Skin Disease Queries
```
- "What are the symptoms of Vicaracika?"
- "How to treat red skin rashes on hands?"
- "What causes Kushta according to Ayurveda?"
- "Natural remedies for eczema in Ayurvedic texts"
```

#### Mental Health Queries
```
- "How can I manage anxiety using Ayurveda?"
- "What herbs help with insomnia and stress?"
- "Ayurvedic approach to depression"
- "How to improve memory and concentration?"
```

#### Herb/Pharmacopoeia Queries
```
- "What is the botanical name of Haridra?"
- "How to identify Brahmi microscopically?"
- "Preparation method for Guggulu"
- "Quality control tests for Ayurvedic drugs"
```

#### General Queries
```
- "Explain the concept of Tridosha"
- "What are the principles of Ayurvedic diagnosis?"
- "Tell me about Dinacharya (daily routine)"
```

## Query Classification Examples

The system automatically classifies queries and routes to appropriate datasets:

| Query | Intent | Domain | Dataset Used |
|-------|--------|--------|--------------|
| "Red skin rashes on my hands" | clinical_treatment | skin_diseases | ayu_skinDiseases_rag.json |
| "Anxiety and sleeplessness" | clinical_treatment | mental_disorders | ayu_mentalDisorders_rag.json |
| "Botanical name of Haridra" | herb_properties | pharmacopoeia | ayurcheck_rag.json |
| "Ayurvedic health principles" | general | general | All datasets |

## Response Analysis

### What to Expect in Responses

**High-Quality Response**:
- Contains relevant information from knowledge base
- Includes citations: `[Source: page X, section Y]`
- Mentions Sanskrit terms when appropriate
- Provides context and recommendations
- Emphasizes consulting practitioners

**Low-Confidence Response**:
```
"I found some potentially related information, but the confidence is 
too low to provide a reliable answer. Please rephrase your question or 
consult a qualified Ayurvedic practitioner."
```

**No Information Response**:
```
"I apologize, but I don't have specific information about this topic in 
my current knowledge base. The available datasets cover Ayurvedic 
Pharmacopoeia, skin diseases, and mental disorders. Please consult a 
qualified Ayurvedic practitioner for personalized guidance."
```

### Response Quality Indicators

Monitor console logs for quality metrics:

```
🔍 Query classification:
   - Intents: clinical_treatment
   - Recommended datasets: ayu_skinDiseases_rag.json
📝 Query expansions: 3 variations
🔎 Searching dataset: ayu_skinDiseases_rag.json
📊 Search results:
   - Total found: 45
   - After ranking: 38
   - After filtering: 12
✅ Returning 8 most relevant chunks
   1. Score: 0.856 - Vicaracika is a skin disorder...
   2. Score: 0.823 - Treatment for Visphota...
```

## Frontend Integration

### Using with React/Next.js

```typescript
import { useChat } from 'ai/react';

export function EnhancedAyurvedicChat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/ayurveda-enhanced',
  });

  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>
          <strong>{message.role}:</strong> {message.content}
        </div>
      ))}
      
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about Ayurveda..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

### Using with Vanilla JavaScript

```javascript
async function queryEnhancedRAG(question) {
  const response = await fetch('/api/ayurveda-enhanced', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: question }]
    })
  });

  // Handle streaming response
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    console.log('Received:', chunk);
  }
}
```

## Configuration Options

### Environment Variables

```bash
# Required
OPENAI_API_KEY=your_key_here

# Optional tuning
MIN_RELEVANCE_SCORE=0.3          # Confidence threshold (0-1)
HYBRID_ALPHA=0.7                  # Semantic vs keyword weight
MAX_CONTEXT_LENGTH=4000          # Max context tokens
MAX_RETRIEVED_DOCS=8              # Initial retrieval count
```

### Code-Level Configuration

Edit `src/lib/rag-enhancements.ts` to customize:

**Query Classification**:
```typescript
// Add domain-specific keywords
private static skinKeywords = [
  'skin', 'rash', 'eczema', 'psoriasis', 'kushta',
  // Add more keywords here
];
```

**Hybrid Search Weights**:
```typescript
// Adjust semantic vs keyword balance
const hybridScore = HybridSearch.combineScores(
  result.score,
  normalizedKeywordScore,
  0.7  // Change this: 1.0 = pure semantic, 0.0 = pure keyword
);
```

**Relevance Thresholds**:
```typescript
// In RelevanceFilter class
private static readonly MIN_SEMANTIC_SCORE = 0.5;  // Adjust this
private static readonly MIN_KEYWORD_OVERLAP = 0.1; // Adjust this
```

## Performance Optimization

### Caching

The system includes embedding cache (currently not active by default):

```typescript
import { getEmbeddingCache } from '../lib/embedding-cache';

// Enable caching
const cache = getEmbeddingCache(1000); // Cache up to 1000 embeddings
```

### Batch Processing

For multiple queries, batch them to reduce overhead:

```javascript
async function batchQueries(questions) {
  const results = await Promise.all(
    questions.map(q => queryEnhancedRAG(q))
  );
  return results;
}
```

## Monitoring & Debugging

### Enable Verbose Logging

Check console logs for detailed information:
- Query classification results
- Dataset routing decisions
- Search statistics
- Relevance scores
- Retrieved document previews

### Health Monitoring

Periodically check the health endpoint:

```bash
# Health check every 5 minutes
watch -n 300 'curl -s http://localhost:3000/api/ayurveda-enhanced | jq'
```

### Performance Metrics

Monitor these key metrics:
- Response time (should be < 3s)
- Relevance scores (should be > 0.3)
- Document count (should find relevant docs)
- Dataset distribution (queries using correct datasets)

## Troubleshooting

### Issue: "No datasets found"

**Solution**: Ensure at least one RAG dataset exists in `src/data/`:
```bash
ls -l src/data/*_rag.json
```

### Issue: All responses are "No information"

**Solution**: 
1. Check query classification logs
2. Verify dataset content matches query domain
3. Lower `MIN_RELEVANCE_SCORE` if too strict

### Issue: Hallucinated responses

**Solution**:
1. Increase relevance threshold
2. Check grounding instructions in prompt
3. Verify retrieved documents are relevant

### Issue: Slow responses

**Solution**:
1. Reduce `MAX_RETRIEVED_DOCS` 
2. Enable caching
3. Limit query expansions
4. Use streaming for better UX

### Issue: Wrong dataset used

**Solution**:
1. Review query classification keywords
2. Add domain-specific terms to classifier
3. Check console logs for routing decisions

## Best Practices

1. **Query Formulation**:
   - Be specific (e.g., "red skin rashes" vs "skin problem")
   - Use medical terms when known
   - Include Sanskrit terms if familiar

2. **Interpreting Responses**:
   - Check relevance scores in logs
   - Verify citations match query domain
   - Look for grounding phrases

3. **Error Handling**:
   - Always handle streaming response errors
   - Implement retry logic for transient failures
   - Show user-friendly error messages

4. **Production Deployment**:
   - Set appropriate rate limits
   - Monitor API costs (OpenAI usage)
   - Log quality metrics
   - Implement user feedback collection

## Comparison with Base Implementation

| Feature | Base `/api/ayurveda` | Enhanced `/api/ayurveda-enhanced` |
|---------|---------------------|-----------------------------------|
| Datasets | 1 (pharmacopoeia only) | 3 (all domains) |
| Query Classification | No | Yes |
| Hybrid Search | No | Yes |
| Query Expansion | No | Yes |
| Relevance Filtering | Basic | Multi-level |
| Grounding Validation | Minimal | Comprehensive |
| Citation Accuracy | Low | High |
| Clinical Accuracy | Poor (wrong dataset) | Good |

## Next Steps

1. **Test thoroughly** with diverse queries
2. **Monitor metrics** to tune thresholds
3. **Add feedback loop** to improve over time
4. **Consider vector DB** for production scale
5. **Build evaluation suite** with ground truth

## Support

For issues or questions:
- Check logs for diagnostic information
- Review `docs/RAG_IMPROVEMENTS.md` for architecture
- Test with `examples/test-enhanced-rag.js`
- Refer to `docs/RAG_ROOT_CAUSE_ANALYSIS.md` for background

## License

Same as parent project.
