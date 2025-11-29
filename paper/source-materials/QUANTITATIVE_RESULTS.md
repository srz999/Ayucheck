# Quantitative Results

## Achievements
*   Extracted **409 text chunks** from three Ayurvedic PDFs using MinerU OCR and Table Transformer.
*   Built a **Pinecone vector database** with 409 vectors using OpenAI `text-embedding-3-small` (1536 dimensions).
*   Converted user queries into 1536-dimensional vectors and retrieved top-5 most relevant chunks.
*   Passed retrieved context to **GPT-4o-mini** via LangChain for streaming responses.

## Output Metrics
We evaluated the system on a set of test queries:

| Query | Relevant? (Y/N) | Has Sources? (Y/N) | Rating (1-5) |
| :--- | :---: | :---: | :---: |
| I'm having fever, give me a remedy | Y | N | ★★ |
| Give me suggestions to cure eczema and dry skin | Y | Y | ★★★★★ |
| I'm having Jvara, what to do? | Y | Y | ★★★★ |
| How do I maintain a good sleep Schedule? | Y | Y | ★★★ |
| I'm having cold and cough, what to do? | N | N | ★ |

## Challenges & Limitations
### Current Limitations
| Area | Challenge |
| :--- | :--- |
| **Domain Coverage** | Limited to few reference books; needs expansion. |
| **Metadata Extraction** | Rule-based extraction at 92% accuracy; fails on complex formatting. |
| **Multimodal Content** | Tables/formulas extracted but not fully utilized; images not searchable. |

### Technical Challenges
| Area | Challenge |
| :--- | :--- |
| **Hallucination Risk** | RAG reduces but doesn't eliminate; temperature tuning helps. |
| **Cold Start Latency** | Serverless functions have 150ms cold start; optimized with lazy initialization. |
| **Cost at Scale** | $0.38 per 1000 queries; optimization needed for scale. |
