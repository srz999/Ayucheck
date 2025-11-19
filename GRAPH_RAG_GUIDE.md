# Graph RAG Implementation Guide

## 🔗 Overview

This guide covers the **Graph RAG (Retrieval-Augmented Generation)** implementation for the Ayurvedic knowledge base. Unlike traditional vector-based RAG that uses semantic similarity, Graph RAG constructs and queries a knowledge graph to retrieve more structured and relationship-aware context.

## 🎯 What is Graph RAG?

Graph RAG enhances traditional RAG by:

1. **Entity Extraction**: Identifying key entities (herbs, diseases, properties, doshas) from documents
2. **Relationship Extraction**: Finding connections between entities (treats, contains, balances, etc.)
3. **Knowledge Graph Construction**: Building a navigable graph structure
4. **Graph-based Retrieval**: Using graph traversal to find relevant context
5. **Relationship-Aware Context**: Providing context that includes entity relationships

### Traditional RAG vs Graph RAG

| Feature | Traditional Vector RAG | Graph RAG |
|---------|----------------------|-----------|
| **Retrieval Method** | Semantic similarity (embeddings) | Entity matching + graph traversal |
| **Context Type** | Similar text chunks | Entities + relationships + source chunks |
| **Structure** | Flat document chunks | Structured knowledge graph |
| **Relationship Awareness** | Implicit in text | Explicit in graph structure |
| **Query Understanding** | Semantic meaning | Entity recognition + relationships |

## 🏗️ Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Graph RAG System                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Entity Extraction (AyurvedicEntityExtractor)            │
│     └─> Identifies: herbs, diseases, properties, doshas     │
│                                                              │
│  2. Relationship Extraction (AyurvedicRelationshipExtractor)│
│     └─> Finds: treats, balances, contains, prepared_from    │
│                                                              │
│  3. Knowledge Graph (KnowledgeGraphBuilder)                 │
│     └─> Entities + Relationships → Graph Structure          │
│                                                              │
│  4. Graph Retrieval (GraphRAGRetriever)                     │
│     └─> Query → Entity Search → Graph Traversal → Context   │
│                                                              │
│  5. LLM Integration (LangChain)                             │
│     └─> Context + Query → GPT-3.5 → Streaming Response      │
└─────────────────────────────────────────────────────────────┘
```

## 📚 Implementation Details

### 1. Entity Types

The system recognizes the following entity types:

```typescript
type EntityType = 
  | 'herb'         // Ayurvedic herbs and plants (e.g., Amalaki, Guggulu)
  | 'disease'      // Medical conditions (e.g., fever, digestive disorders)
  | 'property'     // Therapeutic properties (e.g., anti-inflammatory, digestive)
  | 'treatment'    // Treatment methods and procedures
  | 'dosha'        // Ayurvedic doshas (Vata, Pitta, Kapha, Tridosha)
  | 'preparation'  // Preparation methods and formulations
  | 'symptom';     // Symptoms and indications
```

**Entity Extraction Patterns**:

- **Herbs**: Recognizes common Ayurvedic herb names (Amalaki, Haritaki, Brahmi, etc.)
- **Doshas**: Identifies Vata, Pitta, Kapha, and Tridosha
- **Diseases**: Matches common medical conditions and disorders
- **Properties**: Extracts therapeutic properties (anti-inflammatory, digestive, etc.)

### 2. Relationship Types

The system identifies the following relationship types:

```typescript
type RelationshipType = 
  | 'treats'        // Herb treats disease
  | 'causes'        // Entity causes condition
  | 'contains'      // Entity contains component
  | 'prepared_from' // Prepared from source
  | 'has_property'  // Has therapeutic property
  | 'balances'      // Balances dosha
  | 'aggravates'    // Aggravates dosha
  | 'used_for'      // Used for purpose (inferred from co-occurrence)
  | 'symptom_of';   // Symptom of condition
```

**Relationship Extraction Methods**:

1. **Pattern Matching**: Uses regex patterns to identify explicit relationships
   - "Amalaki treats fever"
   - "Guggulu balances Vata"
   - "Herb has anti-inflammatory property"

2. **Co-occurrence**: Infers relationships when entities appear together
   - If herb and disease are mentioned in the same chunk, creates "used_for" relationship

### 3. Knowledge Graph Structure

```typescript
interface KnowledgeGraph {
  entities: Map<string, GraphEntity>;           // All entities
  relationships: Map<string, GraphRelationship>; // All relationships
  entityIndex: Map<string, Set<string>>;        // Type → entity IDs
  relationshipIndex: Map<string, Set<string>>;  // Entity ID → relationship IDs
}
```

**Graph Statistics** (for Ayurvedic Pharmacopoeia Vol-1):
- **Entities**: Varies based on document content (typically 50-200)
- **Relationships**: Varies based on entity connections (typically 100-500)
- **Entity Types**: 7 types (herb, disease, property, dosha, etc.)
- **Relationship Types**: 9 types (treats, balances, contains, etc.)

### 4. Retrieval Process

When a user asks a question, the Graph RAG system:

```
User Query: "What herbs treat digestive disorders?"
      ↓
1. Entity Recognition
   - Identifies: "herbs" (type), "digestive disorders" (disease)
      ↓
2. Entity Search
   - Finds matching entities in graph
   - Scores based on name/alias matches
      ↓
3. Graph Traversal
   - Gets relationships for matched entities
   - Finds neighboring entities (connected concepts)
      ↓
4. Context Building
   - Entities list (names, types)
   - Relationships list (source → type → target)
   - Source chunks (actual text from documents)
      ↓
5. LLM Generation
   - Formats context with entities and relationships
   - Sends to GPT-3.5 with streaming
   - Returns relationship-aware response
```

## 🚀 Usage

### Accessing Graph RAG

1. **Web Interface**: Navigate to `http://localhost:3000/graphrag`
2. **API Endpoint**: POST to `/api/graphrag` with chat messages
3. **Health Check**: GET `/api/graphrag` for graph statistics

### Example Queries

```
✅ Good Queries (leverage graph structure):
- "What herbs treat digestive disorders?"
- "Tell me about Amalaki and what it treats"
- "Properties of anti-inflammatory herbs"
- "Herbs that balance Vata dosha"
- "Relationships between Triphala and digestive health"

❌ Less Effective Queries (too general):
- "Tell me about Ayurveda" (no specific entities)
- "What is health?" (too abstract)
```

### API Usage

**POST Request**:
```bash
curl -X POST http://localhost:3000/api/graphrag \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What herbs treat fever?"}
    ]
  }'
```

**GET Request** (Health Check):
```bash
curl http://localhost:3000/api/graphrag
```

**Response** (Health Check):
```json
{
  "status": "healthy",
  "message": "Graph RAG system is running",
  "graph": {
    "totalEntities": 127,
    "totalRelationships": 342,
    "entitiesByType": {
      "herb": 45,
      "disease": 38,
      "property": 25,
      "dosha": 4,
      "treatment": 10,
      "preparation": 5
    },
    "relationshipsByType": {
      "treats": 89,
      "has_property": 112,
      "balances": 34,
      "used_for": 107
    }
  },
  "features": {
    "graphBasedRetrieval": true,
    "entityExtraction": true,
    "relationshipExtraction": true,
    "knowledgeGraphTraversal": true
  }
}
```

## 🛠️ Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional (defaults shown)
# None currently - graph is built in-memory
```

### Customization

#### Adding New Entity Types

Edit `src/lib/graph-rag.ts`:

```typescript
// Add to EntityType
type EntityType = '...' | 'your_new_type';

// Add extraction pattern
private static readonly YOUR_PATTERNS = [
  /\b(pattern1|pattern2)\b/gi,
];

// Add to extractEntities method
YOUR_PATTERNS.forEach(pattern => {
  // extraction logic
});
```

#### Adding New Relationship Types

```typescript
// Add to RelationshipType
type RelationshipType = '...' | 'your_new_relation';

// Add pattern to RELATIONSHIP_PATTERNS
private static readonly RELATIONSHIP_PATTERNS = [
  // existing patterns...
  { 
    pattern: /your_pattern/gi, 
    type: 'your_new_relation' as const 
  },
];
```

## 📊 Performance Characteristics

### Initialization Time
- **First Request**: ~2-5 seconds (builds graph from 220 chunks)
- **Subsequent Requests**: <100ms (graph cached in memory)

### Memory Usage
- **Graph Storage**: ~5-10 MB for 220 chunks
- **Scales linearly**: ~50 KB per chunk

### Retrieval Speed
- **Entity Search**: ~10-50ms for 5 entities
- **Graph Traversal**: ~20-100ms depending on depth
- **Total Retrieval**: ~50-200ms

## 🔍 Comparison with Vector RAG

### When to Use Graph RAG

✅ **Use Graph RAG when**:
- Queries involve specific entities (herb names, diseases)
- You need to understand relationships between concepts
- Structure and connections are important
- Domain has well-defined entity types

✅ **Use Vector RAG when**:
- Queries are semantic/conceptual
- Looking for similar ideas or concepts
- No clear entity structure
- Need fuzzy/approximate matching

### Hybrid Approach

For best results, you can combine both:

```typescript
// 1. Use Graph RAG for entity-based queries
if (hasEntities(query)) {
  context = await graphRAG.retrieveContext(query);
}

// 2. Use Vector RAG for semantic queries
else {
  context = await vectorRAG.similaritySearch(query);
}

// 3. Or combine results from both
const graphContext = await graphRAG.retrieveContext(query);
const vectorContext = await vectorRAG.similaritySearch(query);
const combined = mergeContexts(graphContext, vectorContext);
```

## 🧪 Testing

### Manual Testing

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to Graph RAG UI**:
   ```
   http://localhost:3000/graphrag
   ```

3. **Test queries**:
   - Entity-based: "What is Amalaki?"
   - Relationship-based: "What herbs treat fever?"
   - Property-based: "Anti-inflammatory herbs"
   - Dosha-based: "Herbs that balance Vata"

4. **Check graph statistics**:
   ```bash
   curl http://localhost:3000/api/graphrag
   ```

### Expected Results

**Good Results**:
- Entities mentioned in the query should appear in response
- Relationships should be explained clearly
- Source information should be attributed

**Areas for Improvement**:
- Entity recognition can be enhanced with more patterns
- Relationship extraction can use NLP/ML for better accuracy
- Graph traversal depth can be optimized

## 🚧 Limitations & Future Enhancements

### Current Limitations

1. **Pattern-based Extraction**: Uses regex patterns, may miss complex entities
2. **Simple Relationship Detection**: Basic pattern matching, no deep NLP
3. **In-memory Storage**: Graph rebuilt on each server restart
4. **No Graph Visualization**: No UI for exploring the graph structure

### Potential Enhancements

1. **Advanced NLP**:
   - Use spaCy or transformer models for entity recognition
   - Named Entity Recognition (NER) for better accuracy
   - Dependency parsing for relationship extraction

2. **Persistent Storage**:
   - Save graph to Neo4j or other graph database
   - Enable incremental updates without rebuild
   - Support larger knowledge bases

3. **Graph Visualization**:
   - Add D3.js or Cytoscape.js visualization
   - Interactive graph exploration UI
   - Visual query builder

4. **Hybrid RAG**:
   - Combine graph and vector retrieval
   - Use graph for structured queries, vectors for semantic
   - Weighted fusion of results

5. **Graph Neural Networks**:
   - Use GNNs for better entity/relationship embeddings
   - Learn graph structure for improved retrieval
   - Multi-hop reasoning over the graph

## 📝 Files Overview

```
Graph RAG Implementation Files:

src/lib/graph-rag.ts
├─ GraphEntity             (Entity data structure)
├─ GraphRelationship       (Relationship data structure)
├─ KnowledgeGraph          (Graph structure)
├─ AyurvedicEntityExtractor    (Entity extraction)
├─ AyurvedicRelationshipExtractor (Relationship extraction)
├─ KnowledgeGraphBuilder   (Graph construction)
└─ GraphRAGRetriever       (Retrieval logic)

src/app/api/graphrag/route.ts
├─ initializeGraphRAG()    (Graph initialization)
├─ POST()                  (Chat endpoint)
└─ GET()                   (Health check & stats)

src/app/graphrag/page.tsx
└─ GraphRAGPage            (Page component)

src/app/components/graph-rag-chat.tsx
└─ GraphRAGChat            (UI component)
```

## 🎓 Learning Resources

### Graph RAG Concepts
- [Microsoft GraphRAG](https://www.microsoft.com/en-us/research/blog/graphrag-unlocking-llm-discovery-on-narrative-private-data/)
- [Knowledge Graphs for RAG](https://towardsdatascience.com/knowledge-graphs-for-rag-the-future-of-ai-systems-b3b3e9e3e9c5)
- [Neo4j + LangChain](https://python.langchain.com/docs/integrations/graphs/neo4j_cypher)

### Implementation Guides
- [Building Knowledge Graphs](https://neo4j.com/developer/graph-data-science/)
- [Entity Relationship Extraction](https://spacy.io/usage/linguistic-features#named-entities)
- [Graph-based RAG Systems](https://github.com/run-llama/llama_index/tree/main/docs/examples/query_engine/knowledge_graph_query_engine.ipynb)

## 🤝 Contributing

To improve the Graph RAG implementation:

1. **Enhance Entity Extraction**: Add more patterns or use ML models
2. **Improve Relationship Detection**: Use dependency parsing or transformers
3. **Add Graph Visualization**: Create interactive graph explorer
4. **Optimize Performance**: Cache frequently accessed subgraphs
5. **Add Tests**: Unit tests for extraction and retrieval

---

**Note**: This Graph RAG implementation is designed for educational and research purposes. For production use with sensitive medical information, additional validation and expert review is required.
