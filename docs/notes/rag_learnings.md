# RAG System Learnings & Insights

This document captures key insights and learnings from testing and improving the RAG system.

## Query Phrasing Sensitivity

### Issue: Synonym Variations Produce Different Results

**Date**: November 22, 2025

**Observation**: 
The queries "what is the remedy for eczema?" and "how to cure eczema?" produce different retrieval results despite having the same semantic intent.

**Root Cause**:
- **Keyword Matching (BM25)**: The word "cure" vs "remedy" affects BM25 scoring differently based on term frequency in the corpus
- **Semantic Similarity**: Vector embeddings may map these words to slightly different semantic spaces
- **Query Classification**: The `QueryClassifier` includes "cure" and "remedy" in `clinicalKeywords`, but BM25 scores them independently

**Impact**:
- Users asking the same question with different wording may get inconsistent results
- Reduces system reliability and user trust
- Important medical terms like "cure", "remedy", "treatment", "heal" should be treated as synonyms

**Current System Analysis**:
Looking at `src/lib/rag-enhancements.ts`:
```typescript
private static clinicalKeywords = [
  'treatment', 'cure', 'remedy', 'heal', 'disease', 'disorder', 'condition',
  // ... other keywords
];
```

The keywords are identified for classification but NOT unified for BM25 scoring.

**Potential Solutions**:

1. **Query Expansion** (Currently Exists but Underutilized):
   - Expand `QueryExpander.ayurvedicSynonyms` to include medical term synonyms
   - Example:
     ```typescript
     'cure': ['remedy', 'treatment', 'heal', 'therapeutic'],
     'remedy': ['cure', 'treatment', 'healing', 'therapeutic'],
     ```

2. **Query Normalization**:
   - Normalize query terms before BM25 scoring
   - Map synonyms to canonical forms: "cure" → "treatment", "remedy" → "treatment"

3. **Weighted Query Term Expansion**:
   - When BM25 scoring, include synonym terms with proportional weights
   - If query has "cure", also score for "remedy", "treatment", "heal"

4. **Improved Hybrid Weighting**:
   - Increase semantic (vector) weight when query contains synonymous clinical terms
   - Current: `alpha = 0.7` (70% semantic, 30% BM25)
   - For clinical queries: `alpha = 0.8` (80% semantic to reduce keyword variance)

5. **Term Frequency Analysis**:
   - Log which clinical terms appear most frequently in corpus
   - Adjust IDF calculations or add custom boosting for rare but important terms

**Recommended Implementation**:
Combine approaches #1 and #4:
- Enhance `QueryExpander.ayurvedicSynonyms` with clinical term mappings
- Adjust hybrid search alpha dynamically based on query intent
- For `clinical_treatment` intent queries, increase semantic weight

**Test Queries to Validate Fix**:
```
"what is the remedy for eczema?"
"how to cure eczema?"
"what treats eczema?"
"how to heal eczema?"
"eczema treatment options"
```

All should return similar top-3 documents with comparable relevance scores.

---

## Future Learnings

(Add new insights here as they are discovered)
