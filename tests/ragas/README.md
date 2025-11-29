# Ragas Evaluation for Ayucheck

Comprehensive evaluation suite for the Ayucheck Ayurvedic Knowledge RAG system using the Ragas framework.

## 📚 Overview

This evaluation suite tests:
- **Vector-only retrieval** - Pure semantic search using Pinecone
- **Hybrid retrieval** - Combined vector (70%) + BM25 keyword (30%) search
- **Query variations** - Testing synonym sensitivity (e.g., "remedy" vs "cure")

## 🎯 Metrics Evaluated

### RAG Quality Metrics
1. **Faithfulness** (0-1)
   - Measures if the generated answer is grounded in the retrieved context
   - Detects hallucinations

2. **Answer Relevancy** (0-1)
   - Measures how relevant the answer is to the user's question
   - Penalizes incomplete or off-topic answers

3. **Context Precision** (0-1)
   - Measures if relevant contexts are ranked higher
   - Evaluates retrieval quality

4. **Context Recall** (0-1)
   - Measures if all necessary information was retrieved
   - Detects missing context

5. **Factual Correctness** (0-1)
   - Compares answer against reference ground truth
   - Uses LLM to assess factual accuracy

## 🚀 Setup

### 1. Install Dependencies

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r tests/ragas/requirements.txt
```

### 2. Configure Environment

Ensure your `.env.local` contains:
```bash
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=ayurveda-knowledge
```

### 3. Start Development Server

```bash
npm run dev
# Server should be running on http://localhost:3002
```

## 📊 Running Evaluations

### Basic Usage

```bash
# Evaluate hybrid RAG mode (recommended)
python tests/ragas/evaluate_ayucheck.py --mode hybrid

# Evaluate vector-only mode
python tests/ragas/evaluate_ayucheck.py --mode vector

# Use custom test queries
python tests/ragas/evaluate_ayucheck.py --queries-file custom_queries.json
```

### Advanced Options

```bash
# Use different evaluator model
python tests/ragas/evaluate_ayucheck.py \
  --mode hybrid \
  --evaluator-model gpt-4o \
  --queries-file test_queries.json
```

## 📁 Test Queries Structure

The `test_queries.json` file contains test cases:

```json
[
  {
    "query": "what is the remedy for eczema?",
    "reference": "Ayurvedic treatment for eczema...",
    "category": "skin_diseases",
    "intent": "clinical_treatment"
  }
]
```

### Query Categories
- `skin_diseases` - Skin conditions and treatments
- `mental_disorders` - Mental health and wellness
- `pharmacopoeia` - Herbs and formulations
- `general` - General Ayurvedic knowledge

### Query Intents
- `clinical_treatment` - Treatment seeking
- `herb_properties` - Herb information
- `diagnostic` - Symptom analysis
- `lifestyle` - Diet and lifestyle

## 📈 Understanding Results

### Output Files

Results are saved to `tests/ragas/results/`:

1. **CSV Results** - `ragas_eval_[mode]_[timestamp].csv`
   - Per-query scores for each metric
   - Retrieved contexts
   - Generated answers

2. **JSON Summary** - `ragas_summary_[mode]_[timestamp].json`
   - Aggregated metrics
   - Token usage and cost
   - Configuration details

### Interpreting Scores

| Score Range | Interpretation |
|-------------|----------------|
| 0.8 - 1.0   | Excellent ✅   |
| 0.6 - 0.8   | Good ✓        |
| 0.4 - 0.6   | Fair ⚠️        |
| 0.0 - 0.4   | Poor ❌        |

### Example Output

```
📊 EVALUATION RESULTS
======================================================================

Summary Metrics:
  • Faithfulness           : 0.8542
  • AnswerRelevancy        : 0.7891
  • ContextPrecision       : 0.8123
  • ContextRecall          : 0.7654
  • FactualCorrectness     : 0.8234

💰 Cost Analysis:
  • Total Tokens: 45231
  • Total Cost: $0.1247
```

## 🔬 Analysis Workflows

### 1. Compare Hybrid vs Vector-Only

```bash
# Run both modes
python tests/ragas/evaluate_ayucheck.py --mode hybrid
python tests/ragas/evaluate_ayucheck.py --mode vector

# Compare results
python tests/ragas/compare_results.py \
  results/ragas_eval_hybrid_*.csv \
  results/ragas_eval_vector_*.csv
```

### 2. Test Synonym Sensitivity

The test suite includes synonym pairs:
- "remedy" vs "cure"
- "treatment" vs "heal"
- "disease" vs "disorder"

Check if these produce similar scores in hybrid mode.

### 3. Identify Low-Scoring Queries

```python
import pandas as pd

df = pd.read_csv('results/ragas_eval_hybrid_latest.csv')

# Find queries with low faithfulness
low_faith = df[df['Faithfulness'] < 0.6]
print("Low faithfulness queries:")
print(low_faith[['user_input', 'Faithfulness']])

# Find queries with low context precision
low_precision = df[df['ContextPrecision'] < 0.6]
print("\nLow context precision queries:")
print(low_precision[['user_input', 'ContextPrecision']])
```

## 🎯 Using Results for Improvement

### Low Faithfulness → Update Prompts
If faithfulness is low, the LLM is hallucinating. Solutions:
- Strengthen grounding instructions in prompts
- Add "only use provided context" constraints
- Reduce temperature parameter

### Low Context Precision → Improve Retrieval
If context precision is low, irrelevant docs are retrieved. Solutions:
- Adjust BM25 vs vector weights in hybrid search
- Add more specific metadata filters
- Improve query expansion in `rag-enhancements.ts`

### Low Answer Relevancy → Improve Generation
If answer relevancy is low, responses are off-topic. Solutions:
- Refine the generation prompt template
- Add query classification for better routing
- Improve context formatting

### Low Context Recall → Expand Search
If context recall is low, missing information. Solutions:
- Increase number of retrieved documents (k)
- Add query expansion with synonyms
- Review namespace routing logic

## 💡 Best Practices

1. **Baseline First**: Run vector-only mode to establish baseline
2. **Test Iterations**: Re-evaluate after each RAG enhancement
3. **Track Costs**: Monitor token usage to stay within budget
4. **Document Changes**: Link evaluation results to code changes
5. **Sample Size**: Use at least 20-30 queries for reliable results

## 🔧 Customization

### Adding Custom Metrics

```python
from ragas.metrics import AspectCritic

# Define custom metric
ayurvedic_accuracy = AspectCritic(
    name="ayurvedic_accuracy",
    definition="Evaluate if the response accurately represents Ayurvedic principles and classical texts",
    llm=evaluator_llm
)

# Add to evaluator
evaluator.metrics.append(ayurvedic_accuracy)
```

### Testing Specific Features

Create focused test files:
- `test_queries_skin.json` - Only skin disease queries
- `test_queries_herbs.json` - Only herb information
- `test_queries_synonyms.json` - Synonym sensitivity tests

## 📚 References

- [Ragas Documentation](https://docs.ragas.io/)
- [RAG Evaluation Best Practices](https://docs.ragas.io/en/latest/concepts/metrics/)
- [Ayucheck Project Docs](../../docs/)

## 🤝 Contributing

When adding new test queries:
1. Include both `query` and `reference` (ground truth)
2. Specify `category` and `intent`
3. Test with both hybrid and vector modes
4. Document findings in `docs/notes/rag_learnings.md`

---

**Last Updated**: November 22, 2025
**Maintainer**: Ayucheck Team
