# Hybrid RAG API Update

The `api/embedpinecone` endpoint has been updated to support a toggle for Hybrid Search (BM25 + Vector) vs. Pure Vector Search.

## Request Format

The API now accepts a `useHybridSearch` boolean flag in the request body.

```json
{
  "messages": [
    { "role": "user", "content": "What is Ashwagandha?" }
  ],
  "useHybridSearch": true  // Set to false to disable BM25 reranking
}
```

- `useHybridSearch: true` (Default): Performs Vector Search + BM25 Reranking (Hybrid).
- `useHybridSearch: false`: Performs Vector Search only.

## Response Headers

The response includes a header indicating the search method used:

- `X-Search-Method`: `Vector + BM25 Hybrid` OR `Vector Only`

## Implementation Details

- **Hybrid Mode**:
  - Retrieves top 10 vector matches.
  - Calculates TF-IDF/BM25 scores locally.
  - Reranks results using a weighted score (70% Vector, 30% BM25).
  - Filters by relevance threshold (0.35).

- **Vector Only Mode**:
  - Retrieves top 10 vector matches.
  - Filters by vector score threshold (0.40).
  - Returns results directly without reranking.
