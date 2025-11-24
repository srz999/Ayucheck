# V. Conclusion and Future Work

## Key Takeaways
*   Built a functional **Ayurvedic RAG chatbot** that answers health queries with accurate, citation-backed responses from the Ayurvedic Pharmacopoeia.
*   Learned that reliable performance depends heavily on **high-quality PDF structure extraction**, sufficient compute for models, and overcoming poor or limited source data.
*   Future work will focus on **advanced RAG techniques**, Ayurvedic-specific embeddings, adding more classical texts, and supporting multiple languages and mobile access.

## Challenges & Limitations
*   **Domain Coverage**: Limited to only few books of reference, needs expansion to comprehensive Ayurvedic corpus.
*   **Metadata Extraction**: Rule-based extraction at 92% accuracy, fails on complex formatting.
*   **Multimodal Content**: Tables and formulas extracted but not fully utilized, images not searchable.
*   **Hallucination Risk**: RAG reduces but doesn't eliminate hallucinations; temperature tuning helps.

## Future Enhancements
1.  **Hybrid Search**: Semantic + keyword (BM25) combination to improve contextual precision for symptoms like indigestion.
2.  **Re-ranking Pipeline**: Cross-encoder information selection.
3.  **User-login Authentication**: Personalized account for users with chat history access.
4.  **Graph RAG**: Build a knowledge graph linking herbs, doshas, and treatments enabling "how" and "why" insights.
5.  **MCP (Model Context Protocol)**: Introduce MCP for modular, secure, and scalable model communication in multi-agent Ayurvedic reasoning.
6.  **Corpus Expansion**: Adding *Charaka Samhita*, *Sushruta Samhita*, and *Ashtanga Hridaya* for clinical views.
