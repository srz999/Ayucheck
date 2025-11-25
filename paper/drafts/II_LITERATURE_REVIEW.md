# II. Literature Review

## Literature Survey

| Paper / Concept | Description | Implementation / Application |
| :--- | :--- | :--- |
| **Retrieval-Augmented Generation** (Lewis et al., 2020) | Combines retrieval from external knowledge with LLM generation to reduce hallucinations and enable knowledge updates without retraining. | Implemented RAG pipeline: retrieve top-10 chunks → augment prompt → generate answer using GPT-4o-mini. |
| **Dense Passage Retrieval - DPR** (Karpukhin et al., 2020) | Uses dense vector representations for semantic search, outperforming sparse BM25 by 9-19% on open-domain QA. | Applied OpenAI `text-embedding-3-small` (1536-dim) for query and document encoding with cosine similarity. |
| **DETR: End-to-End Object Detection** (Carion et al., 2020) | Transformer-based architecture for object detection, foundation for table detection models. | Used Table Transformer (built on DETR) to detect and extract tables from Mental disorders and Skin Diseases PDF. |
| **LayoutLMv3** (Huang et al., 2022) | Multi-modal pre-training for document understanding combining text, layout. | Used via MinerU framework for structure-aware PDF extraction preserving page layout and formulas. |
| **LangChain Expression Language (LCEL)** | Declarative chain composition using Runnable Sequence for building LLM applications with streaming support. | Built RAG chain: PromptTemplate → ChatOpenAI → HttpResponseOutputParser with Server-Sent Events streaming. |

## Research Gap
*   Most systems use standard text extraction (PyPDF), losing vital tabular data common in pharmacopoeias.
*   Few systems address the specific linguistic challenges of transliterated Sanskrit terms in RAG.
*   Our work bridges this gap by applying structure-aware parsing (MinerU) specifically to the Ayurvedic domain.
