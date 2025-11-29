# Log Sequence Validation Prompt

## Purpose
Analyze query log files from the Ayurvedic RAG system to validate that the execution sequence matches the implementation flow defined in the codebase.

---

## System Architecture Overview

### Technology Stack
- **Frontend**: Next.js with React (`ayurvedic-pinecone-chat.tsx`)
- **Backend API**: Next.js API route (`/api/embedpinecone/route.ts`)
- **Vector Database**: Pinecone (cloud-hosted)
- **Search Enhancement**: Hybrid RAG (Vector + BM25 keyword search)
- **LLM**: OpenAI GPT-4o-mini
- **Logging**: QueryLogger class (`src/lib/query-logger.ts`)

---

## Expected Flow Sequences

### 1. SITE INITIALIZATION SEQUENCE (Page Load)

When the user loads the site (`ayurvedic-pinecone-chat.tsx`), the following sequence should occur:

#### Step 1: Component Mount
- **Component**: `AyurvedicPineconeChat` mounts
- **State Initialization**:
  - `connectionStatus` = 'checking'
  - `useHybridRAG` = true (default)
  - `messages` = [welcome message]

#### Step 2: Health Check Trigger
- **Trigger**: `useEffect()` hook fires on mount (line ~56)
- **Action**: `checkPineconeHealth()` function called
- **Expected Behavior**:
  - Sends GET request to `/api/embedpinecone`
  - Sets headers: `Accept: application/json`

#### Step 3: Backend Health Check (GET endpoint)
- **File**: `route.ts` (line ~505)
- **Function**: `GET()` handler
- **Expected Operations**:
  1. Get Pinecone index: `pc.index(PINECONE_CONFIG.indexName)`
  2. Call: `index.describeIndexStats()`
  3. Return JSON with:
     - `status: 'healthy'` or `'unhealthy'`
     - `vectorDatabase: 'Pinecone'`
     - `indexName: string`
     - `vectorCount: number`
     - `dimension: 1536`
     - `timestamp: ISO string`

#### Step 4: Frontend Status Update
- **Action**: Frontend receives health check response
- **State Updates**:
  - `setPineconeInfo(data)` - stores index stats
  - `setConnectionStatus('connected')` - updates UI status
- **UI Rendering**:
  - Status indicator shows: "✅ Hybrid RAG Connected (X vectors)"
  - Index name displayed
  - Toggle button shows: "🚀 Hybrid RAG"

#### Step 5: Welcome Message Display
- **Content**: Markdown-formatted welcome message
- **Includes**:
  - System capabilities
  - Available knowledge bases
  - RAG mode indicator (Hybrid vs Vector Only)

**⚠️ NO QUERY LOGS GENERATED DURING SITE LOAD** - Logs only created during user queries.

---

### 2. USER QUERY SEQUENCE (When User Submits Question)

#### Frontend Query Submission

##### Step A: User Input
- **Trigger**: User types query and hits Enter
- **Component**: Input field (`handleInputChange`)
- **Form Submit**: `handleSubmit()` from `useChat` hook

##### Step B: API Request Preparation
- **Hook**: `useChat` from 'ai/react'
- **API Endpoint**: `/api/embedpinecone` (POST)
- **Request Body**:
  ```json
  {
    "messages": [
      { "role": "user", "content": "user question here" }
    ],
    "useHybridSearch": true
  }
  ```

##### Step C: UI Loading State
- **State Change**: `isLoading` = true
- **UI Update**: Loading spinner with message:
  - "🚀 Running hybrid search (vector + BM25 keyword)..." (if hybrid mode)
  - "🌲 Searching Pinecone cloud database..." (if vector only mode)

---

#### Backend Query Processing (POST endpoint)

The following sequence generates the query log file:

##### **STEP 1: Vector Search (Pinecone)**
- **File**: `route.ts` (line ~219)
- **Function**: POST handler
- **Log Entry**: `logVectorSearch()`

**Expected Log Structure**:
```json
{
  "stepNumber": 1,
  "stepName": "Vector Search (Pinecone)",
  "timestamp": "ISO-8601",
  "duration": "<milliseconds>",
  "details": {
    "namespacesSearched": [
      "",
      "skin-diseases",
      "skin-diseases-tables",
      "mental-disorders",
      "mental-disorders-tables"
    ],
    "totalMatchesFound": 25,
    "topResults": [
      {
        "rank": 1,
        "namespace": "string",
        "score": "0.XXXX",
        "contentPreview": "First 100 chars..."
      }
    ]
  }
}
```

**Validation Checks**:
- ✅ `stepNumber` must be 1
- ✅ 5 namespaces searched in parallel
- ✅ `totalMatchesFound` should be ~25 (5 per namespace × 5)
- ✅ Scores are between 0.0 and 1.0
- ✅ Duration typically 2000-5000ms (Pinecone API latency)

---

##### **STEP 2: BM25 Keyword Analysis** (if hybridSearch = true)
- **File**: `route.ts` (line ~282)
- **Function**: `logger.logBM25Analysis()`

**Expected Log Structure**:
```json
{
  "stepNumber": 2,
  "stepName": "BM25 Keyword Analysis",
  "timestamp": "ISO-8601",
  "duration": "<milliseconds, typically 1-10ms>",
  "details": {
    "queryTerms": ["word1", "word2", "..."],
    "documentCount": 10,
    "idfScoresCalculated": "N/A",
    "bm25Parameters": {
      "k1": 1.5,
      "b": 0.75,
      "description": "k1 controls term frequency saturation, b controls length normalization"
    }
  }
}
```

**Validation Checks**:
- ✅ `stepNumber` must be 2
- ✅ `queryTerms` contains tokenized query words (lowercase)
- ✅ `documentCount` = 10 (top 10 from vector search)
- ✅ Duration should be < 50ms (local computation)
- ✅ BM25 parameters: k1=1.5, b=0.75 (standard values)

**⚠️ Skip if `useHybridSearch = false`**

---

##### **STEP 3: Hybrid Reranking (Vector + BM25)** (if hybridSearch = true)
- **File**: `route.ts` (line ~285)
- **Function**: `HybridSearch.rerank()` → `logger.logHybridReranking()`

**Expected Log Structure**:
```json
{
  "stepNumber": 3,
  "stepName": "Hybrid Reranking (Vector + BM25)",
  "timestamp": "ISO-8601",
  "duration": "<milliseconds, typically 1-20ms>",
  "details": {
    "vectorWeight": "70%",
    "keywordWeight": "30%",
    "resultsCount": 10,
    "topRerankedResults": [
      {
        "rank": 1,
        "vectorScore": "0.XXXX",
        "hybridScore": "0.YYYY",
        "contentPreview": "First 100 chars..."
      }
    ]
  }
}
```

**Validation Checks**:
- ✅ `stepNumber` must be 3
- ✅ `vectorWeight` = "70%", `keywordWeight` = "30%"
- ✅ `resultsCount` = 10
- ✅ `hybridScore` ≤ `vectorScore` (weighted down from 100% to 70%)
- ✅ Ranking may change from Step 1 (BM25 boosts keyword-relevant docs)
- ✅ Duration < 50ms (local computation)

**⚠️ Skip if `useHybridSearch = false`**

---

##### **STEP 4: Document Filtering**
- **File**: `route.ts` (line ~291-320)
- **Function**: `logger.logFilteredDocuments()`

**Expected Log Structure**:
```json
{
  "stepNumber": 4,
  "stepName": "Document Filtering",
  "timestamp": "ISO-8601",
  "duration": "<milliseconds, typically 0-5ms>",
  "details": {
    "relevanceThreshold": 0.35,
    "totalDocumentsFiltered": 5,
    "searchMethod": "Hybrid (Vector + BM25)" | "Vector Only",
    "selectedDocuments": [
      {
        "rank": 1,
        "score": "0.XXXX",
        "namespace": "string",
        "herbName": "string" | "N/A",
        "pageNumber": number | "N/A",
        "contentPreview": "First 100 chars..."
      }
    ]
  }
}
```

**Validation Checks**:
- ✅ `stepNumber` must be 4 (or 2 if no hybrid search)
- ✅ `relevanceThreshold` = 0.35 (hybrid) or 0.40 (vector only)
- ✅ `searchMethod` matches `useHybridSearch` parameter
- ✅ `totalDocumentsFiltered` ≥ 1 (fallback to top 5 if threshold not met)
- ✅ `score` values ≥ threshold (or top 5 if no matches)
- ✅ Duration < 10ms

---

##### **STEP 5: LLM Response Generation**
- **File**: `route.ts` (line ~397)
- **Function**: `logger.logLLMGeneration()`

**Expected Log Structure**:
```json
{
  "stepNumber": 5,
  "stepName": "LLM Response Generation",
  "timestamp": "ISO-8601",
  "duration": 0,
  "details": {
    "model": "gpt-4o-mini",
    "temperature": 0.3,
    "contextDocumentsProvided": 5,
    "streamingEnabled": true,
    "promptType": "Ayurvedic RAG with Citations"
  }
}
```

**Validation Checks**:
- ✅ `stepNumber` must be 5 (or 3 if no hybrid search)
- ✅ `model` = "gpt-4o-mini"
- ✅ `temperature` = 0.3
- ✅ `contextDocumentsProvided` matches filtered document count from Step 4
- ✅ `streamingEnabled` = true
- ✅ `duration` = 0 (streaming response, not waited for)

---

##### **STEP 6: Log File Save**
- **File**: `route.ts` (line ~424)
- **Function**: `logger.saveLog()`

**Expected Log Structure** (file metadata):
```json
{
  "timestamp": "ISO-8601 (query start time)",
  "query": "user question",
  "sessionId": "YYYY-MM-DD_HH-MM-SS_XXXXX",
  "steps": [/* steps 1-5 */],
  "results": {
    "documentsRetrieved": 5,
    "namespacesCovered": [
      "Ayurveda Guidelines for Skin Diseases",
      "Ayurveda Guidelines for Mental Health"
    ],
    "hybridSearchUsed": true,
    "totalProcessingTime": 5000
  }
}
```

**Validation Checks**:
- ✅ `sessionId` format: `YYYY-MM-DD_HH-MM-SS_XXXXX`
- ✅ `steps` array contains 5 steps (hybrid) or 3 steps (vector only)
- ✅ `documentsRetrieved` matches Step 4 filtered count
- ✅ `namespacesCovered` lists unique source documents
- ✅ `hybridSearchUsed` matches request parameter
- ✅ `totalProcessingTime` ≈ sum of all step durations + overhead

---

#### Frontend Response Handling

##### Step D: Stream Response
- **Hook**: `useChat` handles streaming
- **Action**: Message chunks received via SSE
- **UI Update**: Markdown rendered incrementally

##### Step E: Complete Response
- **State Change**: `isLoading` = false
- **UI Update**: 
  - Full message displayed
  - Footer badge shows: "🚀 Powered by Hybrid RAG (Vector 70% + BM25 30%)"

---

## Log Validation Checklist

### General Structure
- [ ] Log file exists in `logs/hybrid-rag-queries/` directory
- [ ] Filename format: `YYYY-MM-DD_HH-MM-SS_XXXXX_query.json`
- [ ] Valid JSON structure
- [ ] Contains all required top-level keys: `timestamp`, `query`, `sessionId`, `steps`, `results`

### Step Sequence Validation
- [ ] Step numbers are sequential (1, 2, 3, ...)
- [ ] No missing or duplicate step numbers
- [ ] Step timestamps are in chronological order
- [ ] Each step has required fields: `stepNumber`, `stepName`, `timestamp`, `details`

### Hybrid RAG Mode Validation
If `results.hybridSearchUsed = true`:
- [ ] Step 1: Vector Search (Pinecone) ✓
- [ ] Step 2: BM25 Keyword Analysis ✓
- [ ] Step 3: Hybrid Reranking (Vector + BM25) ✓
- [ ] Step 4: Document Filtering ✓
- [ ] Step 5: LLM Response Generation ✓

If `results.hybridSearchUsed = false`:
- [ ] Step 1: Vector Search (Pinecone) ✓
- [ ] Step 2: Document Filtering ✓
- [ ] Step 3: LLM Response Generation ✓
- [ ] No BM25 or Hybrid Reranking steps

### Data Consistency Checks
- [ ] Step 1 `totalMatchesFound` ≈ 5 × number of namespaces searched
- [ ] Step 4 `totalDocumentsFiltered` ≤ Step 1 `totalMatchesFound`
- [ ] Step 5 `contextDocumentsProvided` = Step 4 `totalDocumentsFiltered`
- [ ] `results.documentsRetrieved` = Step 4 `totalDocumentsFiltered`
- [ ] Scores decrease or stay same through pipeline (filtering maintains order)

### Performance Validation
- [ ] Step 1 duration: 2000-10000ms (Pinecone API call)
- [ ] Step 2 duration: < 50ms (if exists, local BM25 calculation)
- [ ] Step 3 duration: < 50ms (if exists, local reranking)
- [ ] Step 4 duration: < 10ms (filtering operation)
- [ ] Step 5 duration: 0ms (streaming, not waited)
- [ ] Total processing time matches step durations ± overhead

### Content Validation
- [ ] All `contentPreview` fields are truncated to ~100 characters
- [ ] Namespace values match expected set: `["", "skin-diseases", "skin-diseases-tables", "mental-disorders", "mental-disorders-tables"]`
- [ ] Score format: String with 4 decimal places (e.g., "0.3546")
- [ ] Page numbers are integers or "N/A"

---

## Common Issues to Flag

### 🚨 Critical Issues
1. **Missing steps**: Step sequence has gaps (e.g., 1, 2, 4, 5)
2. **Wrong step order**: Timestamps not in chronological order
3. **Data inconsistency**: Step 5 context docs ≠ Step 4 filtered docs
4. **No vector search**: Step 1 missing or totalMatchesFound = 0
5. **Hybrid mismatch**: `hybridSearchUsed = true` but no BM25/reranking steps

### ⚠️ Warning Issues
1. **Slow vector search**: Step 1 duration > 10000ms (Pinecone timeout/network issue)
2. **Low match count**: Step 1 totalMatchesFound < 10 (index data issue)
3. **No filtered docs**: Step 4 totalDocumentsFiltered = 0 (all below threshold)
4. **High BM25 duration**: Step 2 duration > 100ms (performance degradation)
5. **Negative durations**: Any step with negative duration (timestamp calculation error)

### 💡 Info Issues
1. **Vector-only mode**: Missing BM25 steps (acceptable if `hybridSearchUsed = false`)
2. **Fallback filtering**: Filtered docs below threshold but still selected (expected fallback)
3. **Single namespace results**: All results from one namespace (query-specific, may be correct)

---

## Analysis Prompt Template

Use this template to analyze a log file:

```
ANALYZE THIS QUERY LOG:

[Insert log JSON content here]

VALIDATION CRITERIA:
1. **Sequence Correctness**: Verify step order matches expected flow for the RAG mode
2. **Data Consistency**: Check that document counts align across steps
3. **Performance**: Flag any steps with unusual durations
4. **Hybrid RAG Logic**: Confirm BM25 and reranking occur when hybridSearchUsed = true
5. **Content Quality**: Verify score formats, namespace values, and preview truncation

EXPECTED STEP SEQUENCE:
- Hybrid Mode (5 steps): Vector Search → BM25 Analysis → Hybrid Reranking → Filtering → LLM Generation
- Vector Mode (3 steps): Vector Search → Filtering → LLM Generation

REPORT FORMAT:
✅ **PASS** - Issue not detected
⚠️ **WARNING** - Minor issue or performance concern
🚨 **FAIL** - Critical sequence or data error

SUMMARY:
- Overall Status: [PASS/WARN/FAIL]
- Issues Found: [count]
- Recommendations: [list any fixes needed]
```

---

## Example Valid Log (Abbreviated)

```json
{
  "timestamp": "2025-11-21T11:21:00.052Z",
  "query": "hi what is the remedy for fever",
  "sessionId": "2025-11-21_16-51-00_uj1ij",
  "steps": [
    {
      "stepNumber": 1,
      "stepName": "Vector Search (Pinecone)",
      "duration": 3411,
      "details": {
        "namespacesSearched": ["", "skin-diseases", "skin-diseases-tables", "mental-disorders", "mental-disorders-tables"],
        "totalMatchesFound": 25
      }
    },
    {
      "stepNumber": 2,
      "stepName": "BM25 Keyword Analysis",
      "duration": 3,
      "details": {
        "queryTerms": ["hi", "what", "is", "the", "remedy", "for", "fever"],
        "documentCount": 10
      }
    },
    {
      "stepNumber": 3,
      "stepName": "Hybrid Reranking (Vector + BM25)",
      "duration": 1,
      "details": {
        "vectorWeight": "70%",
        "keywordWeight": "30%",
        "resultsCount": 10
      }
    },
    {
      "stepNumber": 4,
      "stepName": "Document Filtering",
      "duration": 0,
      "details": {
        "relevanceThreshold": 0.35,
        "totalDocumentsFiltered": 5
      }
    },
    {
      "stepNumber": 5,
      "stepName": "LLM Response Generation",
      "duration": 0,
      "details": {
        "model": "gpt-4o-mini",
        "contextDocumentsProvided": 5
      }
    }
  ],
  "results": {
    "documentsRetrieved": 5,
    "hybridSearchUsed": true,
    "totalProcessingTime": 5255
  }
}
```

**This log is VALID** ✅

---

## Usage Instructions

1. **Load a log file** from `logs/hybrid-rag-queries/`
2. **Paste the log content** into the analysis prompt template above
3. **Run validation checks** from the checklist sections
4. **Report findings** with severity levels (✅/⚠️/🚨)
5. **Cross-reference** with implementation files:
   - Frontend: `src/app/components/ayurvedic-pinecone-chat.tsx`
   - Backend: `src/app/api/embedpinecone/route.ts`
   - Logger: `src/lib/query-logger.ts`

---

## Implementation References

### Key Files
- **Frontend Chat Component**: `src/app/components/ayurvedic-pinecone-chat.tsx`
- **API Route (POST/GET)**: `src/app/api/embedpinecone/route.ts`
- **Query Logger Class**: `src/lib/query-logger.ts`
- **Hybrid Search Logic**: `src/lib/rag-enhancements.ts`

### Critical Code Sections
- **Health Check**: `route.ts` GET handler (line ~505)
- **Vector Search**: `route.ts` POST handler (line ~219)
- **BM25 Analysis**: `route.ts` (line ~282)
- **Hybrid Reranking**: `route.ts` (line ~285-290)
- **Document Filtering**: `route.ts` (line ~291-320)
- **LLM Generation**: `route.ts` (line ~397-410)
- **Log Save**: `route.ts` (line ~424-433)

---

## Conclusion

This prompt provides a comprehensive framework for validating query logs against the actual implementation flow. Use it to:
- Debug execution sequence issues
- Verify hybrid RAG behavior
- Identify performance bottlenecks
- Ensure data consistency across pipeline steps
- Validate frontend-backend integration

For any discrepancies found, refer back to the implementation files listed above to understand the expected behavior.
