# Hybrid RAG Integration Guide

## Making `ayurveda-enhanced` Compatible with Pinecone

**Goal:** Combine the best of both RAG implementations into a unified hybrid system that uses Pinecone's vector similarity search with local keyword-based re-ranking and query enhancement features.

---

## 📊 Architecture Comparison

### Current Implementation: `embedpinecone/route.ts`
- ✅ Uses OpenAI embeddings (`text-embedding-3-small`)
- ✅ Uses Pinecone cloud vector database
- ✅ Searches multiple namespaces in parallel (5 namespaces)
- ✅ Builds LangChain Documents from Pinecone match metadata
- ✅ Streams response via ChatOpenAI
- ✅ Includes custom headers (`X-Vector-DB`, `X-Documents-Found`)
- ✅ Rich citation formatting from metadata
- ❌ No query expansion or classification
- ❌ No hybrid keyword scoring
- ❌ No local fallback

### Current Implementation: `ayurveda-enhanced/route.ts`
- ✅ Query classification (routes to appropriate datasets)
- ✅ Query expansion (generates variants for better recall)
- ✅ Hybrid local re-ranking (semantic + keyword)
- ✅ Relevance filtering
- ✅ Multi-dataset support (3 JSON files)
- ✅ Enhanced grounding rules in prompt
- ❌ No vector embeddings
- ❌ No Pinecone integration
- ❌ Limited semantic understanding (keyword-based only)

---

## 🎯 Target Hybrid RAG Architecture

### Features to Combine
1. **Pinecone vector search** (semantic similarity)
2. **Query classification** (namespace routing)
3. **Query expansion** (multiple variants for better recall)
4. **Hybrid scoring** (vector similarity + keyword matching)
5. **Relevance filtering** (quality thresholds)
6. **Local fallback** (when Pinecone unavailable)
7. **Rich citations** (from Pinecone metadata)

### Query Processing Flow
```
User Query
    ↓
Query Classification → Determine target namespaces
    ↓
Query Expansion → Generate 2-3 variants
    ↓
[PARALLEL EXECUTION]
    ├─→ Pinecone Vector Search (for each variant × namespace)
    │   ├─ Generate embeddings
    │   ├─ Search namespaces in parallel
    │   └─ Collect matches with scores
    │
    └─→ Local Keyword Search (fallback/supplement)
        ├─ TF-IDF approximation
        └─ Calculate semantic scores
    ↓
Merge & Deduplicate Results
    ↓
Hybrid Scoring (α × vectorScore + (1-α) × localScore)
    ↓
Re-rank & Filter by Threshold
    ↓
Format with Citations & Metadata
    ↓
Generate Response (ChatOpenAI with grounding rules)
    ↓
Stream to Client
```

---

## 🔧 Implementation Plan

### Step 1: Add Configuration & Imports

**Location:** Top of `src/app/api/ayurveda-enhanced/route.ts`

```typescript
// Add new imports
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';

// Configuration flags
const USE_PINECONE = process.env.USE_PINECONE === 'true' || !!process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'ayurveda-knowledge';
const HYBRID_ALPHA = parseFloat(process.env.HYBRID_ALPHA || '0.7'); // 70% vector, 30% keyword

// Dataset to Pinecone namespace mapping
const PINECONE_NAMESPACE_MAP: Record<string, string> = {
  'ayurcheck_rag.json': '', // default namespace (pharmacopoeia)
  'ayu_skinDiseases_rag.json': 'skin-diseases',
  'ayu_mentalDisorders_rag.json': 'mental-disorders',
};

// Initialize Pinecone (only if enabled)
let pineconeClient: Pinecone | null = null;
let pineconeIndex: any = null;
let embeddingsClient: OpenAIEmbeddings | null = null;

if (USE_PINECONE) {
  try {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    pineconeIndex = pineconeClient.index(PINECONE_INDEX_NAME);
    embeddingsClient = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
      batchSize: 512,
    });
    console.log('✅ Hybrid RAG: Pinecone integration enabled');
  } catch (error) {
    console.error('⚠️ Failed to initialize Pinecone, falling back to local-only mode:', error);
  }
}
```

---

### Step 2: Add Pinecone Search Method

**Location:** Inside `EnhancedAyurvedicRAGLoader` class

```typescript
/**
 * Search using Pinecone vector database
 */
async searchWithPinecone(
  query: string, 
  maxChunks = 8
): Promise<DocumentWithScore[]> {
  if (!USE_PINECONE || !pineconeIndex || !embeddingsClient) {
    console.log('⚠️ Pinecone not available, skipping vector search');
    return [];
  }

  try {
    // Step 1: Get query expansions (limit to 2-3 for cost control)
    const expandedQueries = QueryExpander.expandQuery(query).slice(0, 3);
    console.log(`🔍 Pinecone search with ${expandedQueries.length} query variants`);

    // Step 2: Classify query to determine target namespaces
    const recommendedDatasets = QueryClassifier.getRecommendedDatasets(query);
    const allNamespaces = Object.values(PINECONE_NAMESPACE_MAP);
    
    // Filter to recommended namespaces if classifier found matches
    const targetNamespaces = recommendedDatasets.length > 0
      ? allNamespaces.filter(ns => 
          recommendedDatasets.some(rec => 
            ns.includes(rec.replace('.json', ''))
          )
        )
      : allNamespaces;

    console.log(`🎯 Searching namespaces: ${targetNamespaces.join(', ') || 'default'}`);

    // Step 3: Search Pinecone for each query variant × namespace
    const allMatches: DocumentWithScore[] = [];
    
    for (const variant of expandedQueries) {
      // Generate embedding for this query variant
      const embedding = await embeddingsClient.embedQuery(variant);
      
      // Search each target namespace
      for (const namespace of targetNamespaces) {
        const nsIndex = pineconeIndex.namespace(namespace);
        const response = await nsIndex.query({
          vector: embedding,
          topK: 6, // Get top 6 from each namespace
          includeMetadata: true,
          includeValues: false,
        });

        // Convert Pinecone matches to DocumentWithScore format
        for (const match of response.matches || []) {
          const metadata = match.metadata || {};
          
          const chunk: RAGChunk = {
            id: match.id,
            text: (metadata.content || metadata.text || '') as string,
            type: (metadata.type || 'text') as string,
            section: metadata.section as string | undefined,
            subsection: metadata.subsection as string | undefined,
            page: (metadata.page || metadata.page_number) as number | undefined,
          };

          allMatches.push({
            chunk,
            score: match.score || 0,
          });
        }
      }
    }

    // Step 4: Deduplicate by chunk ID or text content
    const deduped = this.deduplicateResults(allMatches);
    
    console.log(`📊 Pinecone found ${allMatches.length} matches, ${deduped.length} unique`);
    
    return deduped.slice(0, maxChunks * 2); // Return extra for hybrid re-ranking
    
  } catch (error) {
    console.error('❌ Pinecone search failed:', error);
    return []; // Fallback to local search
  }
}

/**
 * Deduplicate results by chunk ID or text similarity
 */
private deduplicateResults(results: DocumentWithScore[]): DocumentWithScore[] {
  const seen = new Map<string, DocumentWithScore>();
  
  for (const result of results) {
    // Use ID if available, otherwise use first 200 chars of text
    const key = result.chunk.id || result.chunk.text.slice(0, 200);
    
    // Keep the result with the highest score
    const existing = seen.get(key);
    if (!existing || result.score > existing.score) {
      seen.set(key, result);
    }
  }
  
  return Array.from(seen.values()).sort((a, b) => b.score - a.score);
}
```

---

### Step 3: Implement Hybrid Scoring

**Location:** Add new method to `EnhancedAyurvedicRAGLoader` class

```typescript
/**
 * Combine vector and keyword scores using weighted average
 */
private hybridScore(
  vectorResults: DocumentWithScore[],
  localResults: DocumentWithScore[],
  alpha = HYBRID_ALPHA
): DocumentWithScore[] {
  // Normalize vector scores (0-1 range)
  const maxVectorScore = Math.max(...vectorResults.map(r => r.score), 1e-6);
  const normalizedVector = vectorResults.map(r => ({
    chunk: r.chunk,
    score: r.score / maxVectorScore,
  }));

  // Normalize local scores (already 0-1 from calculateSemanticScore)
  const maxLocalScore = Math.max(...localResults.map(r => r.score), 1e-6);
  const normalizedLocal = localResults.map(r => ({
    chunk: r.chunk,
    score: r.score / maxLocalScore,
  }));

  // Create map of all chunks
  const chunkMap = new Map<string, {
    chunk: RAGChunk;
    vectorScore: number;
    localScore: number;
  }>();

  // Add vector results
  for (const result of normalizedVector) {
    const key = result.chunk.id || result.chunk.text.slice(0, 200);
    chunkMap.set(key, {
      chunk: result.chunk,
      vectorScore: result.score,
      localScore: 0,
    });
  }

  // Add/merge local results
  for (const result of normalizedLocal) {
    const key = result.chunk.id || result.chunk.text.slice(0, 200);
    const existing = chunkMap.get(key);
    
    if (existing) {
      existing.localScore = result.score;
    } else {
      chunkMap.set(key, {
        chunk: result.chunk,
        vectorScore: 0,
        localScore: result.score,
      });
    }
  }

  // Calculate hybrid scores
  const hybridResults: DocumentWithScore[] = Array.from(chunkMap.values()).map(entry => ({
    chunk: entry.chunk,
    score: alpha * entry.vectorScore + (1 - alpha) * entry.localScore,
  }));

  // Sort by hybrid score
  return hybridResults.sort((a, b) => b.score - a.score);
}
```

---

### Step 4: Update Main Search Method

**Location:** Modify `searchRelevantChunks` method in `EnhancedAyurvedicRAGLoader`

```typescript
/**
 * Enhanced search with Pinecone integration and hybrid scoring
 */
async searchRelevantChunks(query: string, maxChunks = 5): Promise<DocumentWithScore[]> {
  const queryLower = query.toLowerCase();
  
  // Step 1: Classify query and expand
  const recommendedDatasets = QueryClassifier.getRecommendedDatasets(query);
  const intents = QueryClassifier.classifyIntent(query);
  
  console.log(`🔍 Query classification:`);
  console.log(`   - Intents: ${intents.join(', ')}`);
  console.log(`   - Recommended datasets: ${recommendedDatasets.join(', ')}`);

  const expandedQueries = QueryExpander.expandQuery(query);
  console.log(`📝 Query expansions: ${expandedQueries.length} variations`);

  // Step 2: Parallel search - Pinecone + Local
  let vectorResults: DocumentWithScore[] = [];
  let localResults: DocumentWithScore[] = [];

  // Try Pinecone search first
  if (USE_PINECONE) {
    console.log('🚀 Using Pinecone vector search');
    vectorResults = await this.searchWithPinecone(query, maxChunks * 2);
  }

  // Always run local search (for fallback and hybrid scoring)
  console.log('🔍 Running local keyword search');
  const datasetsToSearch = this.datasetNames.filter(name => 
    recommendedDatasets.some(rec => name.includes(rec.replace('.json', '')))
  );
  const searchDatasets = datasetsToSearch.length > 0 ? datasetsToSearch : this.datasetNames;

  for (const datasetName of searchDatasets) {
    const data = this.datasets.get(datasetName);
    if (!data) continue;

    for (const expandedQuery of expandedQueries.slice(0, 3)) {
      const results = this.searchDataset(data, expandedQuery, datasetName);
      localResults.push(...results);
    }
  }

  // Step 3: Choose strategy based on available results
  let finalResults: DocumentWithScore[];

  if (vectorResults.length > 0 && localResults.length > 0) {
    // Hybrid mode: combine both
    console.log('🎯 Hybrid mode: combining vector + keyword scores');
    finalResults = this.hybridScore(vectorResults, localResults, HYBRID_ALPHA);
  } else if (vectorResults.length > 0) {
    // Vector-only mode
    console.log('📊 Vector-only mode (no local results)');
    finalResults = vectorResults;
  } else {
    // Local-only fallback
    console.log('📚 Local-only mode (Pinecone unavailable or no results)');
    finalResults = this.rerankWithHybridSearch(query, localResults);
  }

  // Step 4: Filter by relevance
  const relevantResults = finalResults.filter(result => 
    result.score > 0.1 && // Minimum threshold
    RelevanceFilter.isRelevant(query, result.chunk.text, result.score)
  );

  console.log(`📊 Search results:`);
  console.log(`   - Vector results: ${vectorResults.length}`);
  console.log(`   - Local results: ${localResults.length}`);
  console.log(`   - After hybrid scoring: ${finalResults.length}`);
  console.log(`   - After filtering: ${relevantResults.length}`);

  // Step 5: Return top chunks
  const topResults = relevantResults.slice(0, maxChunks);
  
  if (topResults.length === 0) {
    console.log('⚠️ No relevant documents found for query');
  } else {
    console.log(`✅ Returning ${topResults.length} most relevant chunks`);
    topResults.forEach((result, idx) => {
      console.log(`   ${idx + 1}. Score: ${result.score.toFixed(3)} - ${result.chunk.text.substring(0, 80)}...`);
    });
  }

  return topResults;
}
```

---

### Step 5: Update Environment Configuration

**Location:** `.env.local`

```env
# Required for all modes
OPENAI_API_KEY=sk-...

# Enable Pinecone hybrid mode (optional - defaults to local-only)
USE_PINECONE=true
PINECONE_API_KEY=pcsk-...
PINECONE_INDEX_NAME=ayurveda-knowledge
PINECONE_ENVIRONMENT=us-east-1-aws

# Hybrid scoring weight (optional - default 0.7)
# HYBRID_ALPHA=0.7  # 70% vector, 30% keyword
```

---

### Step 6: Update Prompt Template

**Location:** In the `POST` handler, update the prompt to handle Pinecone citations

```typescript
// Enhanced prompt with Pinecone citation support
const prompt = PromptTemplate.fromTemplate(`You are an expert in Ayurveda and traditional Indian medicine. You have access to the Ayurvedic knowledge base through both vector search and traditional text analysis.

CONVERSATION HISTORY:
{chat_history}

AYURVEDIC CONTEXT (Retrieved from Knowledge Base):
{context}

CURRENT QUESTION: {question}

**CRITICAL GROUNDING RULES:**
1. Answer ONLY based on the provided Ayurvedic context above
2. If the context doesn't contain relevant information, clearly state: "The available texts don't contain specific information about this topic"
3. DO NOT generate recommendations from general knowledge if not in the context
4. Include relevant Sanskrit terms and their meanings when present in the context
5. **Cite sources using the format provided in the context** (look for 【...】 markers)
6. For Pinecone-sourced information, use: 【Source†Page X】 format
7. For local knowledge base, use: [Source: Document Y, Page X]
8. Provide information about therapeutic properties, dosage, and preparation methods ONLY if present in context
9. Always emphasize consulting qualified Ayurvedic practitioners for medical advice
10. If context is from pharmacopoeia (lab testing), state it's technical/reference information, not treatment advice

Response guidelines:
- Be comprehensive but stay grounded in the provided context
- Use citations for every factual claim
- Mention the confidence level if the context is limited
- Suggest related topics if the exact answer isn't in the context
- Indicate which search method found the information (vector/semantic vs keyword) when relevant

Please provide a detailed, grounded response:`);
```

---

## 🧪 Testing Strategy

### 1. Unit Tests (Manual Verification)

**Test Local-Only Mode:**
```bash
# Remove Pinecone credentials temporarily
# Comment out USE_PINECONE=true in .env.local
npm run dev
node examples/test-enhanced-rag.js
```

**Expected:**
- ✅ Should fall back to local keyword search
- ✅ Logs should show "Local-only mode"
- ✅ No Pinecone errors

---

**Test Pinecone-Only Mode:**
```bash
# Set HYBRID_ALPHA=1.0 (100% vector)
npm run dev
node examples/test-pinecone-rag.js
```

**Expected:**
- ✅ Should use only vector scores
- ✅ Logs show "Vector-only mode"
- ✅ Citations include Pinecone metadata

---

**Test Hybrid Mode:**
```bash
# Set HYBRID_ALPHA=0.7 (default)
# Ensure both Pinecone and local search active
npm run dev
node examples/test-pinecone-rag.js --query "What is Haridra?"
```

**Expected:**
- ✅ Logs show "Hybrid mode: combining vector + keyword scores"
- ✅ Results from both sources merged
- ✅ Quality score > 70%

---

### 2. CLI Manual Testing

```bash
# Interactive mode
node examples/test-pinecone-rag.js --interactive

# Single query
node examples/test-pinecone-rag.js --query "How to treat anxiety with Ayurvedic herbs?"

# Full test suite
node examples/test-pinecone-rag.js
```

---

### 3. Quality Validation Checklist

For each test query, verify:

- [ ] **Response Length:** > 500 characters for good quality
- [ ] **Citations Present:** At least 3 citations with proper format
- [ ] **Vector Indicators:** Ayurvedic terms (pharmacopoeia, guidelines, etc.)
- [ ] **Sanskrit Terms:** At least 3 Sanskrit terms present
- [ ] **Expected Features:** 70%+ of query-specific features found
- [ ] **Grounding Phrases:** "according to", "based on", "mentions", etc.
- [ ] **Botanical Names:** Present when discussing herbs
- [ ] **Dosha References:** Present when relevant
- [ ] **No Refusals:** System shouldn't refuse when data exists
- [ ] **Quality Score:** ≥ 70% overall

---

## 📊 Performance Optimization

### 1. Query Expansion Limits
```typescript
// Limit expansions to control cost
const expandedQueries = QueryExpander.expandQuery(query).slice(0, 3);
```

**Rationale:** Each expansion creates new embeddings and Pinecone queries. Limit to 2-3 variants.

---

### 2. Namespace Targeting
```typescript
// Use QueryClassifier to reduce namespace searches
const targetNamespaces = recommendedDatasets.length > 0
  ? allNamespaces.filter(ns => /* match recommended */)
  : allNamespaces;
```

**Rationale:** Searching all 5 namespaces for every query is expensive. Classifier reduces this to 1-2 namespaces.

---

### 3. Result Caching (Optional Enhancement)
```typescript
// Add simple in-memory cache
const queryCache = new Map<string, DocumentWithScore[]>();

async searchWithPinecone(query: string, maxChunks = 8) {
  const cacheKey = `${query}:${maxChunks}`;
  if (queryCache.has(cacheKey)) {
    console.log('✅ Cache hit for query');
    return queryCache.get(cacheKey)!;
  }
  
  const results = await /* ... actual search ... */;
  queryCache.set(cacheKey, results);
  return results;
}
```

---

### 4. Batch Embedding Generation
```typescript
// Instead of embedding each variant separately:
const allEmbeddings = await embeddingsClient.embedDocuments(expandedQueries);

// Use in parallel searches
for (let i = 0; i < expandedQueries.length; i++) {
  const embedding = allEmbeddings[i];
  // ... search with this embedding
}
```

---

## 🔧 Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_PINECONE` | `false` | Enable Pinecone vector search |
| `PINECONE_API_KEY` | - | Pinecone API key (required if enabled) |
| `PINECONE_INDEX_NAME` | `ayurveda-knowledge` | Pinecone index name |
| `PINECONE_ENVIRONMENT` | `us-east-1-aws` | Pinecone environment |
| `HYBRID_ALPHA` | `0.7` | Weight for vector vs keyword (0-1) |
| `OPENAI_API_KEY` | - | OpenAI API key (required) |

---

### Namespace Mapping

| Dataset File | Pinecone Namespace | Content Type |
|--------------|-------------------|--------------|
| `ayurcheck_rag.json` | `` (default) | Ayurvedic Pharmacopoeia |
| `ayu_skinDiseases_rag.json` | `skin-diseases` | Skin disease guidelines |
| `ayu_mentalDisorders_rag.json` | `mental-disorders` | Mental health guidelines |

---

## 🚨 Error Handling & Fallback

### Pinecone Connection Failure
```typescript
if (USE_PINECONE) {
  try {
    pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    // ...
  } catch (error) {
    console.error('⚠️ Pinecone initialization failed, using local-only mode');
    USE_PINECONE = false; // Disable for this session
  }
}
```

---

### Pinecone Query Failure
```typescript
try {
  const response = await nsIndex.query({ /* ... */ });
} catch (error) {
  console.error('❌ Pinecone query failed:', error);
  return []; // Return empty, fallback to local search
}
```

---

### No Results Strategy
```typescript
if (vectorResults.length === 0 && localResults.length === 0) {
  console.log('⚠️ No results from any source');
  return NextResponse.json({
    message: "I don't have specific information about this topic...",
    query: question,
    documentsFound: 0
  });
}
```

---

## 📈 Success Metrics

### Quality Thresholds
- **Minimum Quality Score:** 70%
- **Citation Count:** ≥ 3 per response
- **Response Length:** ≥ 500 characters
- **Feature Match:** ≥ 70% of expected features
- **Grounding Score:** ≥ 2 grounding phrases

### Performance Targets
- **Response Time:** < 10 seconds (including embeddings)
- **First Token Time:** < 3 seconds
- **Cache Hit Rate:** > 30% (if caching enabled)
- **Pinecone Availability:** > 99%

---

## 🔄 Migration Steps (Incremental Rollout)

### Phase 1: Add Configuration (No Behavior Change)
- [ ] Add Pinecone imports and config flags
- [ ] Initialize Pinecone client conditionally
- [ ] Add logging to show which mode is active
- [ ] Test: Verify no breaking changes

### Phase 2: Implement Pinecone Search (Parallel Mode)
- [ ] Add `searchWithPinecone` method
- [ ] Call in parallel with local search
- [ ] Log results from both sources
- [ ] Test: Verify Pinecone returns results

### Phase 3: Implement Hybrid Scoring
- [ ] Add `hybridScore` method
- [ ] Combine vector + keyword scores
- [ ] Update `searchRelevantChunks` to use hybrid
- [ ] Test: Verify combined results

### Phase 4: Add Query Optimization
- [ ] Use QueryClassifier for namespace targeting
- [ ] Limit query expansions to 2-3
- [ ] Add deduplication
- [ ] Test: Verify performance improvements

### Phase 5: Production Hardening
- [ ] Add comprehensive error handling
- [ ] Add fallback logic
- [ ] Add monitoring/logging
- [ ] Test: Verify reliability under failures

---

## 🐛 Common Issues & Solutions

### Issue: "Pinecone API key not found"
**Solution:**
```bash
# Check .env.local exists
ls -la .env.local

# Verify key is set
grep PINECONE_API_KEY .env.local

# Restart dev server
npm run dev
```

---

### Issue: "No results from Pinecone"
**Diagnosis:**
```bash
# Check index stats
node examples/test-pinecone-rag.js
# Look for "vectorCount: 409" in health check
```

**Solutions:**
- Verify index name matches: `PINECONE_INDEX_NAME=ayurveda-knowledge`
- Check namespace exists: Pinecone console → View data
- Verify embeddings uploaded: Run upload script

---

### Issue: "Quality score always < 70%"
**Diagnosis:** Check which checks are failing in test output

**Solutions:**
- **No citations:** Check metadata mapping in `formatChunksAsContext`
- **No Sanskrit terms:** May be retrieving wrong documents (adjust namespace)
- **No grounding phrases:** Update prompt to enforce "according to..." phrases
- **Low feature match:** Query expansion not finding right documents (tune threshold)

---

### Issue: "Response too slow (>10s)"
**Diagnosis:** Check terminal logs for timing

**Solutions:**
- Reduce query expansions: `slice(0, 2)` instead of `slice(0, 3)`
- Reduce `topK` per namespace: `topK: 4` instead of `topK: 6`
- Limit target namespaces with better classification
- Add caching for frequent queries

---

## 📚 Additional Resources

### Related Documentation
- [`docs/RAG_IMPLEMENTATIONS_COMPARISON.md`](./RAG_IMPLEMENTATIONS_COMPARISON.md) - Detailed comparison
- [`docs/RAG_FIX_SUMMARY.md`](./RAG_FIX_SUMMARY.md) - Test improvements
- [`examples/QUICK_TEST_GUIDE.md`](../examples/QUICK_TEST_GUIDE.md) - Testing guide
- [`INTEGRATION_GUIDE.md`](../INTEGRATION_GUIDE.md) - System architecture

### External Documentation
- [Pinecone Docs](https://docs.pinecone.io/)
- [LangChain RAG](https://js.langchain.com/docs/modules/chains/popular/vector_db_qa)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)

---

## 🎯 Next Steps After Implementation

1. **Run Full Test Suite**
   ```bash
   node examples/test-pinecone-rag.js
   ```

2. **Validate Quality Metrics**
   - Check success rate > 80%
   - Verify citation density
   - Monitor response times

3. **A/B Testing** (Optional)
   - Compare hybrid vs vector-only
   - Measure user satisfaction
   - Tune HYBRID_ALPHA based on results

4. **Production Deployment**
   - Set up monitoring (response times, error rates)
   - Configure alerts for Pinecone downtime
   - Enable query caching
   - Set up analytics dashboard

5. **Future Enhancements**
   - Add re-ranking model (e.g., Cohere Rerank)
   - Implement cross-encoder for better relevance
   - Add user feedback loop
   - Experiment with different embedding models

---

## ✅ Implementation Checklist

### Code Changes
- [ ] Add Pinecone imports and configuration
- [ ] Initialize Pinecone client conditionally
- [ ] Implement `searchWithPinecone` method
- [ ] Implement `hybridScore` method
- [ ] Implement `deduplicateResults` method
- [ ] Update `searchRelevantChunks` for hybrid mode
- [ ] Update prompt template for Pinecone citations
- [ ] Add comprehensive error handling

### Testing
- [ ] Test local-only mode (no Pinecone)
- [ ] Test Pinecone-only mode (HYBRID_ALPHA=1.0)
- [ ] Test hybrid mode (HYBRID_ALPHA=0.7)
- [ ] Run full automated test suite
- [ ] Manual CLI testing for edge cases
- [ ] Validate quality metrics (>70% score)

### Documentation
- [ ] Update `.env.local.example` with new variables
- [ ] Add inline code comments
- [ ] Update API documentation
- [ ] Document configuration options

### Deployment
- [ ] Set environment variables in production
- [ ] Test in staging environment
- [ ] Monitor error rates and response times
- [ ] Deploy to production
- [ ] Set up monitoring alerts

---

**Last Updated:** November 14, 2025  
**Version:** 1.0  
**Status:** Ready for Implementation
