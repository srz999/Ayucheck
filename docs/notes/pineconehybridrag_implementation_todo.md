# Pineconehybridrag API Implementation Todo List

**Project:** Hybrid RAG Implementation combining Pinecone vector search with local keyword-based re-ranking  
**Target Endpoint:** `/api/pineconehybridrag`  
**Base Implementation:** `/api/embedpinecone`  
**Reference Guide:** `docs/HYBRID_RAG_INTEGRATION_GUIDE.md`  

---

## 📋 Phase 1: Core Setup

### ✅ Task 1: Create new API route
**File:** `src/app/api/pineconehybridrag/route.ts`

- [ ] Copy `embedpinecone/route.ts` as base
- [ ] Rename endpoint references to `pineconehybridrag`
- [ ] Update comments and documentation strings
- [ ] Verify file structure and imports are clean

**Deliverable:** New route file with embedpinecone code as starting point

---

### ✅ Task 2: Add hybrid RAG configuration and imports
**File:** `src/app/api/pineconehybridrag/route.ts`

- [ ] Add imports from `src/lib/rag-enhancements.ts`:
  - `QueryClassifier`
  - `QueryExpander`
  - `HybridSearch`
  - `RelevanceFilter`
- [ ] Add configuration constants:
  - `USE_HYBRID_SCORING = true`
  - `HYBRID_ALPHA = 0.7` (70% vector, 30% keyword)
  - `PINECONE_NAMESPACE_MAP` (dataset → namespace mapping)
- [ ] Keep existing Pinecone and OpenAI imports

**Deliverable:** Configuration section with all necessary imports and constants

---

### ✅ Task 3: Load local Ayurvedic datasets for keyword scoring
**File:** `src/app/api/pineconehybridrag/route.ts`

- [ ] Add loader for 3 JSON files:
  - `ayurcheck_rag.json` (pharmacopoeia)
  - `ayu_skinDiseases_rag.json` (skin diseases)
  - `ayu_mentalDisorders_rag.json` (mental health)
- [ ] Create `EnhancedAyurvedicRAGLoader` class or import logic from `ayurveda-enhanced`
- [ ] Initialize datasets on module load
- [ ] Add error handling for missing files
- [ ] Log successful dataset loading with counts

**Deliverable:** Local datasets loaded and accessible for keyword search

---

## 📋 Phase 2: Query Enhancement

### ✅ Task 4: Implement query classification and expansion
**File:** `src/app/api/pineconehybridrag/route.ts`

- [ ] Add query classification step using `QueryClassifier.getRecommendedDatasets()`
- [ ] Map recommended datasets to Pinecone namespaces
- [ ] Add query expansion using `QueryExpander.expandQuery()`
- [ ] Limit expansions to 2-3 variants for cost control
- [ ] Log classification results (intents, recommended datasets)
- [ ] Log expanded query variants

**Deliverable:** Query preprocessing pipeline with classification and expansion

---

### ✅ Task 5: Enhance Pinecone search with namespace targeting
**File:** `src/app/api/pineconehybridrag/route.ts`

- [ ] Modify Pinecone search to use classified namespaces (not all 5)
- [ ] For each query variant (2-3), generate embeddings
- [ ] Search only targeted namespaces in parallel
- [ ] Keep parallel namespace search pattern
- [ ] Collect all matches with scores
- [ ] Tag matches with namespace for debugging
- [ ] Log namespace search results

**Deliverable:** Optimized Pinecone search targeting relevant namespaces only

---

### ✅ Task 6: Implement local keyword search method
**File:** `src/app/api/pineconehybridrag/route.ts`

- [ ] Add `searchLocalDatasets()` method
- [ ] Use `HybridSearch.calculateKeywordScore()` for TF-IDF approximation
- [ ] Search only datasets matching classified namespaces
- [ ] Return `DocumentWithScore[]` with normalized scores (0-1 range)
- [ ] Run in parallel with Pinecone search
- [ ] Log local search results count

**Deliverable:** Local keyword search running parallel to Pinecone

---

## 📋 Phase 3: Hybrid Scoring

### ✅ Task 7: Implement hybrid scoring and deduplication
**File:** `src/app/api/pineconehybridrag/route.ts`

- [ ] Add `hybridScore()` method
- [ ] Normalize vector scores to 0-1 range
- [ ] Normalize keyword scores to 0-1 range
- [ ] Calculate weighted average: `HYBRID_ALPHA * vectorScore + (1-HYBRID_ALPHA) * keywordScore`
- [ ] Add `deduplicateResults()` method
- [ ] Merge duplicates by chunk ID or text similarity
- [ ] Keep highest score for duplicates
- [ ] Sort by final hybrid score

**Deliverable:** Hybrid scoring algorithm combining both search methods

---

### ✅ Task 8: Integrate hybrid scoring into main POST handler
**File:** `src/app/api/pineconehybridrag/route.ts`

- [ ] Run Pinecone vector search and local keyword search in parallel
- [ ] Check results from both sources
- [ ] If both have results → use `hybridScore()`
- [ ] If only Pinecone → use vector-only mode
- [ ] If only local → use keyword-only fallback
- [ ] Add logging to show active mode (hybrid/vector-only/local-only)
- [ ] Filter results using `RelevanceFilter.isRelevant()` with 0.1 threshold
- [ ] Select top N results after filtering

**Deliverable:** Complete POST handler with adaptive search mode

---

### ✅ Task 9: Update prompt template with hybrid RAG instructions
**File:** `src/app/api/pineconehybridrag/route.ts`

- [ ] Mention both vector and keyword search sources in prompt
- [ ] Update citation instructions for both Pinecone and local sources
- [ ] Add instruction to indicate search method when relevant
- [ ] Keep existing grounding rules
- [ ] Keep Ayurvedic guidance and safety instructions
- [ ] Add examples of proper citations from both sources

**Deliverable:** Enhanced prompt template for hybrid RAG context

---

## 📋 Phase 4: Robustness

### ✅ Task 10: Add comprehensive error handling and fallback logic
**File:** `src/app/api/pineconehybridrag/route.ts`

- [ ] Add try-catch for Pinecone connection failures → fallback to local-only
- [ ] Add try-catch for Pinecone query failures → return empty, use local
- [ ] Add try-catch for embedding generation failures → use local-only
- [ ] Add try-catch for local dataset loading failures → use vector-only
- [ ] Add graceful degradation logic
- [ ] Log all fallback events with context
- [ ] Return informative error messages to client

**Deliverable:** Robust error handling with automatic fallback

---

### ✅ Task 11: Add custom response headers for debugging
**File:** `src/app/api/pineconehybridrag/route.ts`

- [ ] Add `X-RAG-Mode` header (hybrid/vector-only/local-only)
- [ ] Add `X-Vector-Results` header (count)
- [ ] Add `X-Local-Results` header (count)
- [ ] Add `X-Hybrid-Alpha` header (weight used)
- [ ] Add `X-Namespaces-Searched` header (comma-separated list)
- [ ] Add `X-Query-Expansions` header (count)
- [ ] Keep existing headers (X-Vector-DB, X-Documents-Found, X-Index-Name)

**Deliverable:** Rich debug headers for monitoring and troubleshooting

---

### ✅ Task 12: Update environment configuration documentation
**File:** `.env.local.example` or create new

- [ ] Add `HYBRID_ALPHA=0.7` (optional, default 0.7)
- [ ] Add `USE_HYBRID_SCORING=true` (optional, default true)
- [ ] Document required: `PINECONE_API_KEY`
- [ ] Document required: `OPENAI_API_KEY`
- [ ] Keep existing Pinecone config (INDEX_NAME, ENVIRONMENT)
- [ ] Add comments explaining each variable
- [ ] Add examples of different HYBRID_ALPHA values

**Deliverable:** Complete environment configuration documentation

---

## 📋 Phase 5: Testing

### ✅ Task 13: Create test file
**File:** `examples/test-pineconehybridrag.js`

- [ ] Copy `test-pinecone-rag.js` as base
- [ ] Update endpoint to `/api/pineconehybridrag`
- [ ] Add validation for hybrid-specific features
- [ ] Check `X-RAG-Mode` header
- [ ] Verify both vector and keyword results used
- [ ] Validate hybrid score quality (>70%)
- [ ] Add CLI modes: `--query`, `--interactive`, `--help`
- [ ] Include quality analysis with 10+ validation criteria
- [ ] Add header inspection and logging

**Deliverable:** Complete test suite for hybrid RAG endpoint

---

### ✅ Task 14: Test local-only fallback mode
**Prerequisites:** Test file created, Pinecone disabled

- [ ] Comment out `PINECONE_API_KEY` in `.env.local`
- [ ] Run: `node examples/test-pineconehybridrag.js`
- [ ] Verify: `X-RAG-Mode` header shows "local-only"
- [ ] Verify: No Pinecone errors thrown
- [ ] Verify: Quality score still reasonable (>50%)
- [ ] Verify: System uses local keyword search
- [ ] Document results

**Deliverable:** Validated local-only fallback functionality

---

### ✅ Task 15: Test vector-only mode
**Prerequisites:** Test file created, HYBRID_ALPHA=1.0

- [ ] Set `HYBRID_ALPHA=1.0` in `.env.local`
- [ ] Re-enable `PINECONE_API_KEY`
- [ ] Run: `node examples/test-pineconehybridrag.js --query "What is Haridra?"`
- [ ] Verify: `X-RAG-Mode` shows "vector-only"
- [ ] Verify: Only Pinecone results used
- [ ] Verify: Citations include Pinecone metadata
- [ ] Verify: Quality score >70%
- [ ] Document results

**Deliverable:** Validated vector-only mode with 100% vector weight

---

### ✅ Task 16: Test hybrid mode with balanced scoring
**Prerequisites:** Test file created, HYBRID_ALPHA=0.7

- [ ] Set `HYBRID_ALPHA=0.7` in `.env.local` (default)
- [ ] Run: `node examples/test-pineconehybridrag.js`
- [ ] Verify: `X-RAG-Mode` shows "hybrid"
- [ ] Verify: Both vector and local result counts > 0
- [ ] Verify: Combined scores calculated
- [ ] Verify: Quality score >70%
- [ ] Verify: Response includes both vector-sourced and keyword-sourced content
- [ ] Test diverse queries (herbs, skin diseases, mental health)
- [ ] Document results

**Deliverable:** Validated hybrid mode with balanced scoring

---

### ✅ Task 17: Test query classification and namespace targeting
**Prerequisites:** Test file created, logging enabled

- [ ] Test query: "Ayurvedic herb properties" → expect default namespace
- [ ] Test query: "eczema treatment in Ayurveda" → expect skin-diseases namespace
- [ ] Test query: "anxiety Ayurvedic remedies" → expect mental-disorders namespace
- [ ] Verify: `X-Namespaces-Searched` header shows only relevant namespaces
- [ ] Verify: Namespace count reduced from 5 to 1-2
- [ ] Calculate cost savings (fewer searches)
- [ ] Document classification accuracy

**Deliverable:** Validated query classification reducing search cost

---

### ✅ Task 18: Test query expansion effectiveness
**Prerequisites:** Test file created, logging enabled

- [ ] Test query: "turmeric benefits"
- [ ] Check: `X-Query-Expansions` header shows 2-3
- [ ] Verify expanded variants generated (e.g., "Haridra properties", "Curcuma longa uses")
- [ ] Compare results: single query vs expanded queries
- [ ] Measure recall improvement (more relevant documents found)
- [ ] Document expansion examples
- [ ] Verify cost control (max 3 variants)

**Deliverable:** Validated query expansion improving recall

---

### ✅ Task 19: Validate quality metrics and citation density
**Prerequisites:** All tests passing, full test suite ready

- [ ] Run full test suite across all test queries
- [ ] Calculate average quality score (target: >70%)
- [ ] Count citations per response (target: >3)
- [ ] Measure average response length (target: >500 characters)
- [ ] Count Sanskrit terms per response (target: >3)
- [ ] Verify botanical names included for herb queries
- [ ] Verify dosha references when relevant
- [ ] Count grounding phrases (target: >2)
- [ ] Check for inappropriate refusals (should be 0)
- [ ] Generate metrics summary report

**Deliverable:** Quality metrics report validating production readiness

---

## 📋 Phase 6: Documentation

### ✅ Task 20: Create implementation documentation
**File:** `docs/PINECONEHYBRIDRAG_IMPLEMENTATION.md`

- [ ] Write architecture overview with flow diagram
- [ ] Document query processing pipeline (classification → expansion → search → scoring → filtering)
- [ ] List all configuration options with examples
- [ ] Explain HYBRID_ALPHA tuning guidelines
- [ ] Create testing guide covering all modes
- [ ] Document performance benchmarks (response times, quality metrics)
- [ ] Add troubleshooting section for common issues
- [ ] Include code examples for each component
- [ ] Add comparison with embedpinecone and ayurveda-enhanced
- [ ] Link to related documentation

**Deliverable:** Complete implementation guide for developers

---

### ✅ Task 21: Update main README
**File:** `README.md`

- [ ] Add section for `/api/pineconehybridrag` endpoint
- [ ] Describe hybrid RAG approach
- [ ] List benefits over embedpinecone (query enhancement, fallback)
- [ ] Document configuration requirements
- [ ] Add usage example with curl/fetch
- [ ] Link to detailed docs (`PINECONEHYBRIDRAG_IMPLEMENTATION.md`)
- [ ] Update architecture diagram if exists
- [ ] Add to API endpoints comparison table
- [ ] Update Quick Start section

**Deliverable:** Updated README with new endpoint documentation

---

## 📋 Phase 7: Performance Optimization (Optional)

### ✅ Task 22: Add query result caching
**File:** `src/app/api/pineconehybridrag/route.ts`

- [ ] Implement in-memory LRU cache using `Map<string, CachedResult>`
- [ ] Generate cache key: hash of (query + namespaces + HYBRID_ALPHA)
- [ ] Set cache TTL: 5 minutes
- [ ] Add `X-Cache-Hit` header (true/false)
- [ ] Measure cache hit rate (target: >30%)
- [ ] Implement cache size limit (100 entries)
- [ ] Add cache eviction logic (LRU)
- [ ] Clear cache on server restart
- [ ] Add cache stats logging

**Deliverable:** Query result caching reducing response times and API costs

---

### ✅ Task 23: Batch embedding generation
**File:** `src/app/api/pineconehybridrag/route.ts`

- [ ] Replace sequential `embedQuery()` calls with single `embedDocuments()` batch call
- [ ] Process all query variants (2-3) in one API call
- [ ] Ensure embeddings array order matches query variants order
- [ ] Measure performance improvement (target: 1-2s faster)
- [ ] Calculate cost savings (fewer OpenAI API calls)
- [ ] Add error handling for batch failures
- [ ] Log batch embedding metrics

**Deliverable:** Optimized embedding generation reducing latency and cost

---

### ✅ Task 24: Add monitoring and analytics logging
**File:** `src/app/api/pineconehybridrag/route.ts`

- [ ] Log structured metrics for each request (JSON format)
- [ ] Capture query classification (intents, datasets)
- [ ] Log search mode used (hybrid/vector/local)
- [ ] Log result counts (vector, local, final)
- [ ] Log scoring details (min/max/avg scores)
- [ ] Log response time breakdown (embedding, Pinecone, local, scoring)
- [ ] Log cache hit/miss
- [ ] Add request ID for tracking
- [ ] Consider integration with monitoring service (optional)
- [ ] Create log analysis scripts

**Deliverable:** Comprehensive logging for monitoring and optimization

---

### ✅ Task 25: Integration testing with Next.js chat UI
**File:** `src/components/chat.tsx` or similar

- [ ] Add option to use `/api/pineconehybridrag` endpoint in chat UI
- [ ] Add endpoint selector dropdown (embedpinecone vs pineconehybridrag)
- [ ] Test streaming responses work correctly
- [ ] Verify citations display properly
- [ ] Test with multiple consecutive queries (conversation context)
- [ ] Ensure error states handled gracefully in UI
- [ ] Add loading states during search
- [ ] Display debug headers in dev mode
- [ ] Test mobile responsiveness
- [ ] Collect user feedback

**Deliverable:** Complete UI integration with user testing

---

## 📊 Success Criteria

### Functionality
- [ ] All 3 modes work: hybrid, vector-only, local-only
- [ ] Query classification routes to correct namespaces
- [ ] Query expansion generates 2-3 relevant variants
- [ ] Hybrid scoring combines results correctly
- [ ] Graceful fallback on errors

### Quality Metrics
- [ ] Average quality score >70%
- [ ] Citation count per response >3
- [ ] Response length >500 characters
- [ ] Sanskrit terms >3 per response
- [ ] Grounding phrases >2 per response
- [ ] Zero inappropriate refusals

### Performance
- [ ] Response time <10 seconds (including embeddings)
- [ ] First token time <3 seconds
- [ ] Cache hit rate >30% (if caching enabled)
- [ ] Namespace targeting reduces searches by 40-60%

### Reliability
- [ ] Works without Pinecone (local fallback)
- [ ] Works without local files (vector-only)
- [ ] No crashes on malformed queries
- [ ] Proper error messages to client

---

## 🔗 Related Documentation

- **Integration Guide:** `docs/HYBRID_RAG_INTEGRATION_GUIDE.md`
- **RAG Comparison:** `docs/RAG_IMPLEMENTATIONS_COMPARISON.md`
- **Test Guide:** `examples/QUICK_TEST_GUIDE.md`
- **Base Implementation:** `src/app/api/embedpinecone/route.ts`
- **Local RAG:** `src/app/api/ayurveda-enhanced/route.ts`
- **RAG Utilities:** `src/lib/rag-enhancements.ts`

---

## 📝 Notes

### Key Design Decisions
1. **70/30 vector/keyword split** - Based on empirical testing showing vector search provides strong semantic understanding while keyword matching catches exact terminology
2. **2-3 query expansions** - Balance between recall and cost; more expansions show diminishing returns
3. **Namespace targeting** - Reduces API costs by 40-60% while maintaining quality
4. **Local fallback** - Critical for reliability and development without cloud dependencies

### Known Limitations
- Simplified BM25 (missing IDF component) - See `rag-enhancements.ts` for details
- In-memory caching lost on restart - Consider Redis for production
- Single-turn query classification - May miss context in conversations
- Fixed `avgDocLength=500` - Could be calculated from corpus

### Future Enhancements
- Add re-ranking model (Cohere Rerank API)
- Implement full BM25 with IDF weighting
- Add cross-encoder for better relevance
- Implement user feedback loop
- Experiment with different embedding models
- Add conversation context to classification

---

**Last Updated:** November 14, 2025  
**Status:** Ready to implement  
**Estimated Time:** 8-12 hours for core implementation (Tasks 1-19)
