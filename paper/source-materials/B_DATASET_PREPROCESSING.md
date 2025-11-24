# B. Dataset Preprocessing Steps

## 1. PDF Parsing Tool Selection
We evaluated three tools for extracting data from the Ayurvedic Pharmacopoeia:

1.  **Docling (IBM library)**:
    *   *Limitation*: Could not read continuous data spanning multiple pages.
    *   *Performance*: Slower compared to PyMuPDF.
2.  **PyMuPDF**:
    *   *Strength*: Successfully extracted 39,948 words; faster extraction.
    *   *Limitation*: No proper order when verifying content.
3.  **MinerU (Final Choice)**:
    *   *Strength*: Advanced PDF processing with AI models (LayoutLMv3).
    *   *Result*: Comprehensive content extraction including tables, formulas, and images. Data extraction quality was significantly better.

## 2. Tabular Content Extraction
We utilized **Microsoft Table Transformer** (based on DETR - Detection Transformer) to:
*   **Detect tables**: Find table locations in PDF pages.
*   **Recognize structure**: Identify rows, columns, and cells.
*   **Extract data**: Convert to structured formats (JSON/JSONL) for RAG.

## 3. Chunking and Metadata Enrichment
*   **Chunking Strategy**: Semantic chunking based on document sections.
*   **Metadata Extraction**: Each chunk is tagged with `page_number`, `section`, `type`, and `source`.
*   **Total Chunks**: 409 text chunks extracted from three Ayurvedic PDFs.

## 4. Embedding Generation
*   **Model**: OpenAI `text-embedding-3-small`.
*   **Dimensions**: 1536.
*   **Process**: Text content is converted into dense vectors for semantic search.
