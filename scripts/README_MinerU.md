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

## Usage

### Method 1: Direct Script Execution

#### Basic MinerU Conversion
```bash
cd scripts
python pdf_to_json_mineru_enhanced.py ../src/data/AyurCheck_API-Vol-1.pdf
```

#### With Custom Output Path
```bash
python pdf_to_json_mineru_enhanced.py ../src/data/AyurCheck_API-Vol-1.pdf -o custom_output.json
```

#### Verbose Mode
```bash
python pdf_to_json_mineru_enhanced.py ../src/data/AyurCheck_API-Vol-1.pdf --verbose
```

#### OCR-Only Mode (for scanned PDFs)
```bash
python pdf_to_json_mineru_enhanced.py scanned_document.pdf --ocr-only
```

### Method 2: Test Script
```bash
python test_mineru_conversion.py
```

### Method 3: Compare Different Methods
```bash
python compare_pdf_converters.py
```

## Output Format

MinerU produces a comprehensive JSON structure:

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

## Script Details

### `pdf_to_json_mineru.py`
Basic MinerU converter with essential functionality.

### `pdf_to_json_mineru_enhanced.py`
Advanced converter with:
- Automatic MinerU installation
- Configuration management
- Enhanced error handling
- Detailed output processing
- Statistics and metadata

### `test_mineru_conversion.py`
Test script specifically for converting `AyurCheck_API-Vol-1.pdf`.

### `compare_pdf_converters.py`
Comparison tool that tests both PyMuPDF and MinerU on the same document.

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

After running the converter, you'll find these files in `src/data/`:
- `ayurcheck_api_vol1_mineru.json` - Main structured output
- `ayurcheck_pymupdf_test.json` - PyMuPDF comparison output
- `ayurcheck_mineru_test.json` - MinerU comparison output

## Integration with RAG System

The JSON output is designed to work seamlessly with LangChain and RAG applications:

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

## References

- [MinerU GitHub Repository](https://github.com/opendatalab/MinerU)
- [MinerU Documentation](https://opendatalab.github.io/MinerU/)
- [MinerU 2.5 Technical Report](https://arxiv.org/abs/2509.22186)
- [PyMuPDF Documentation](https://pymupdf.readthedocs.io/)