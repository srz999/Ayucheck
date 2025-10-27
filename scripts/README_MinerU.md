# PDF to JSON Conversion Scripts

This directory contains scripts for converting PDF files to JSON format using different methods, with a focus on **MinerU** - a powerful document parsing tool.

## Overview

### Available Converters

1. **PyMuPDF** (`pdf_to_json_pymupdf.py`) - Fast, lightweight text extraction
2. **MinerU** (`pdf_to_json_mineru_enhanced.py`) - Advanced document parsing with structure recognition

## MinerU - Advanced Document Parser

[MinerU](https://github.com/opendatalab/MinerU) is a state-of-the-art tool that converts PDFs into machine-readable formats with high accuracy.

### Key Features

- 🔍 **Layout Analysis** - Recognizes document structure and reading order
- 📊 **Table Extraction** - Converts tables to HTML format
- 🔢 **Formula Recognition** - Extracts mathematical formulas as LaTeX
- 🖼️ **Image Extraction** - Saves embedded images separately
- 🌍 **Multi-language OCR** - Supports 84 languages
- 📱 **Complex Layouts** - Handles multi-column and complex documents
- ⚡ **GPU Acceleration** - Optional CUDA/MPS support

### Installation

The script will automatically install MinerU, but you can also install manually:

```bash
pip install -U mineru[core]
```

For GPU acceleration (optional):
```bash
pip install -U mineru[full]
```

## Usage - Complete Pipeline

### Step 1: PDF to JSON Conversion

The first step converts a PDF document into structured JSON format using MinerU.

#### Method 1: Quick Start Script (Recommended)
```bash
cd scripts
./convert_with_mineru.sh
```
This script automatically:
- Uses the MinerU virtual environment
- Converts `AyurCheck_API-Vol-1.pdf` to `ayurcheck_api_vol1_mineru.json`
- Provides progress feedback

#### Method 2: Direct Script Execution
```bash
cd scripts

# Basic MinerU Conversion
python pdf_to_json_mineru_enhanced.py ../src/data/AyurCheck_API-Vol-1.pdf

# With Custom Output Path
python pdf_to_json_mineru_enhanced.py ../src/data/AyurCheck_API-Vol-1.pdf -o custom_output.json

# Verbose Mode
python pdf_to_json_mineru_enhanced.py ../src/data/AyurCheck_API-Vol-1.pdf --verbose

# OCR-Only Mode (for scanned PDFs)
python pdf_to_json_mineru_enhanced.py scanned_document.pdf --ocr-only
```

#### Method 3: Using Virtual Environment
```bash
cd scripts

# Activate MinerU environment and convert
./activate_mineru.sh ../src/data/AyurCheck_API-Vol-1.pdf

# Or manually activate and run
source mineru_venv/bin/activate
python pdf_to_json_mineru_enhanced.py ../src/data/AyurCheck_API-Vol-1.pdf
```

### Step 2: JSON to RAG-Compatible Output

The second step converts the MinerU JSON output into clean, RAG-friendly formats.

#### Convert to Multiple Formats
```bash
cd scripts

# Convert MinerU JSON to RAG formats (.json, .jsonl, .md)
python mineru_to_rag.py ../src/data/ayurcheck_api_vol1_mineru.json -o ../src/data/ayurcheck_rag

# This creates:
# - ayurcheck_rag_rag.json    (structured for web apps)
# - ayurcheck_rag_rag.jsonl   (for vector databases) 
# - ayurcheck_rag_rag.md      (human-readable)
```

#### Custom Output Name
```bash
python mineru_to_rag.py ../src/data/ayurcheck_api_vol1_mineru.json -o ../src/data/my_custom_rag
```

### Complete Pipeline Example
```bash
cd scripts

# Step 1: PDF → MinerU JSON
./convert_with_mineru.sh

# Step 2: MinerU JSON → RAG Formats  
python mineru_to_rag.py ../src/data/ayurcheck_api_vol1_mineru.json -o ../src/data/ayurcheck_rag_new

# Result: Ready-to-use RAG files in src/data/
```

### Alternative Methods

#### Test Scripts
```bash
python test_mineru_conversion.py
```

#### Compare Different Methods
```bash
python compare_pdf_converters.py
```

## Output Formats

### Step 1 Output: MinerU JSON

MinerU produces a comprehensive JSON structure with full document analysis:

```json
{
  "title": "Document Title",
  "source": "/path/to/source.pdf",
  "conversion_info": {
    "converter": "mineru",
    "version": "2.5.x"
  },
  "content": [...],           // Structured document content
  "full_text": "...",        // Complete extracted text
  "markdown_content": [...], // Markdown format
  "extracted_images": [...], // Image metadata
  "tables": [...],           // Extracted tables
  "formulas": [...],         // Mathematical formulas
  "metadata": {
    "statistics": {
      "total_text_length": 50000,
      "content_items": 150,
      "extracted_images": 12,
      "tables_found": 8,
      "formulas_found": 25
    }
  }
}
```

### Step 2 Output: RAG-Compatible Formats

The `mineru_to_rag.py` script converts MinerU output into three optimized formats:

#### 1. Structured JSON (.json) - For Web Applications
```json
[
  {
    "id": "chunk_001",
    "text": "Clean, processed text chunk",
    "type": "text",
    "page": 1,
    "section": "Introduction",
    "metadata": {
      "source": "AyurCheck_API-Vol-1.pdf",
      "chunk_index": 0
    }
  }
]
```

#### 2. JSONL (.jsonl) - For Vector Databases
```jsonl
{"id": "chunk_001", "text": "Clean text chunk 1", "type": "text", "page": 1}
{"id": "chunk_002", "text": "Clean text chunk 2", "type": "text", "page": 1}
```

#### 3. Markdown (.md) - For Human Review
```markdown
# Document Title

## Page 1

### chunk_001 (text)
Clean, processed text chunk

### chunk_002 (formula)
Mathematical formula content
```

### Output Statistics Example
```
📊 Statistics:
   Total chunks: 220
   Text chunks: 212
   Table chunks: 2
   Formula chunks: 6
   Average chunk length: 1128 characters
```

## Script Details

### PDF to JSON Conversion Scripts

#### `convert_with_mineru.sh` (Recommended)
Quick start script that:
- Automatically uses MinerU virtual environment
- Converts the default PDF to JSON
- Provides clear progress feedback
- Handles virtual environment activation

#### `pdf_to_json_mineru_enhanced.py`
Advanced converter with:
- Automatic MinerU installation
- Configuration management
- Enhanced error handling
- Detailed output processing
- Statistics and metadata

#### `pdf_to_json_mineru.py`
Basic MinerU converter with essential functionality.

#### `activate_mineru.sh`
Virtual environment activation script for manual conversions.

### RAG Conversion Scripts

#### `mineru_to_rag.py` (Essential)
Converts MinerU JSON to RAG-friendly formats:
- **Input**: MinerU JSON output (complex structure)
- **Output**: Clean text chunks in 3 formats (.json, .jsonl, .md)
- **Features**:
  - Text cleaning and normalization
  - Chunk size optimization (average 1128 characters)
  - Metadata preservation
  - Multiple output formats for different use cases

### Utility Scripts

#### `test_mineru_conversion.py`
Test script specifically for converting `AyurCheck_API-Vol-1.pdf`.

#### `compare_pdf_converters.py`
Comparison tool that tests both PyMuPDF and MinerU on the same document.

#### `setup_mineru_enhanced.py`
Virtual environment setup script for MinerU installation.

## Configuration

MinerU can be configured via `~/.config/mineru/mineru.json`:

```json
{
  "layout": {
    "model": "layoutlmv3"
  },
  "formula": {
    "enable": true,
    "model": "unimernet"
  },
  "table": {
    "enable": true,
    "model": "rapidtable"
  },
  "ocr": {
    "enable": true,
    "model": "paddleocr"
  }
}
```

## Performance Comparison

| Method  | Speed | Text Quality | Structure | Tables | Formulas | Images |
|---------|-------|--------------|-----------|---------|----------|---------|
| PyMuPDF | ⚡⚡⚡  | ⭐⭐⭐      | ⭐        | ❌      | ❌       | ⭐      |
| MinerU  | ⚡⚡   | ⭐⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐⭐ |

## Use Cases

### Choose MinerU when:
- Document has complex layouts (multi-column, academic papers)
- Tables need to be extracted accurately
- Mathematical formulas are present
- Need structured output for RAG/LLM applications
- Document contains images that need extraction
- Processing scanned/OCR documents

### Choose PyMuPDF when:
- Simple text extraction is sufficient
- Speed is critical
- Processing large volumes of simple documents
- Minimal dependencies required

## Troubleshooting

### Common Issues

1. **Installation fails**: Try updating pip first
   ```bash
   pip install --upgrade pip
   pip install -U mineru[core]
   ```

2. **GPU not detected**: Install CUDA-specific version
   ```bash
   pip install -U mineru[full]
   ```

3. **Timeout errors**: Large PDFs may need longer processing time

4. **OCR accuracy**: For scanned documents, ensure high resolution and good quality

### Environment Requirements

- **CPU**: Modern multi-core processor
- **RAM**: Minimum 16GB, recommended 32GB+
- **GPU**: Optional, NVIDIA Turing+ with 6GB+ VRAM
- **Python**: 3.10-3.13
- **Disk**: 20GB+ free space

## Example Output Files

### After Step 1 (PDF → JSON)
Running `./convert_with_mineru.sh` creates:
- `ayurcheck_api_vol1_mineru.json` - Complete MinerU extraction (complex structure)

### After Step 2 (JSON → RAG)
Running `python mineru_to_rag.py ... -o ayurcheck_rag` creates:
- `ayurcheck_rag_rag.json` - Clean chunks for web applications
- `ayurcheck_rag_rag.jsonl` - Line-delimited JSON for vector databases
- `ayurcheck_rag_rag.md` - Human-readable markdown format

### Complete File Structure
```
src/data/
├── AyurCheck_API-Vol-1.pdf              # Source PDF
├── ayurcheck_api_vol1_mineru.json       # Step 1: MinerU output
├── ayurcheck_rag_rag.json               # Step 2: Web app format
├── ayurcheck_rag_rag.jsonl              # Step 2: Vector DB format
└── ayurcheck_rag_rag.md                 # Step 2: Human review format
```

### Legacy/Comparison Files
- `ayurcheck_pymupdf_test.json` - PyMuPDF comparison output
- `ayurcheck_mineru_test.json` - MinerU comparison output

## Integration with RAG Systems

### Using RAG-Compatible Output (Recommended)

After running both conversion steps, use the optimized RAG formats:

#### For Vector Databases (Chroma, Qdrant, Pinecone)
```python
import json

# Load JSONL for vector database ingestion
with open("ayurcheck_rag_rag.jsonl", "r") as f:
    chunks = [json.loads(line) for line in f]

# Each chunk is ready for embedding
for chunk in chunks:
    text = chunk["text"]      # Clean text for embedding
    metadata = {
        "id": chunk["id"],
        "page": chunk["page"],
        "type": chunk["type"]
    }
```

#### For Web Applications
```python
import json

# Load structured JSON for web app
with open("ayurcheck_rag_rag.json", "r") as f:
    rag_data = json.load(f)

# Use with LangChain
from langchain.schema import Document

documents = [
    Document(
        page_content=chunk["text"],
        metadata=chunk.get("metadata", {})
    )
    for chunk in rag_data
]
```

### Using Raw MinerU Output (Advanced)

For direct access to MinerU's structured output:

```python
from langchain_community.document_loaders import JSONLoader

# Load MinerU output for RAG
loader = JSONLoader(
    "ayurcheck_api_vol1_mineru.json",
    jq_schema=".content[].text",  # Extract text from content array
    text_content=False
)
documents = loader.load()
```

### Recommended Workflow

1. **For Production RAG**: Use the cleaned RAG formats (`.json`, `.jsonl`)
2. **For Development**: Review the `.md` format to verify extraction quality
3. **For Advanced Use Cases**: Access raw MinerU JSON for custom processing

## References

- [MinerU GitHub Repository](https://github.com/opendatalab/MinerU)
- [MinerU Documentation](https://opendatalab.github.io/MinerU/)
- [MinerU 2.5 Technical Report](https://arxiv.org/abs/2509.22186)
- [PyMuPDF Documentation](https://pymupdf.readthedocs.io/)