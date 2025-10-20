# MinerU Setup Guide - Updated Configuration

## Quick Setup (3 Steps)

### 1. Install MinerU
```bash
pip install -U mineru[core]
```

### 2. Download Models (REQUIRED - One Time Setup)
```bash
mineru-models-download
```

**This command will:**
- Download PDF-Extract-Kit models (~4GB) for layout, tables, formulas
- Download VLM models (~2.4GB) for vision-language processing  
- Create config at `C:\Users\vinit\mineru.json` with model paths
- Store models in `~/.cache/huggingface/hub/`

**Expected output:**
```
Downloading models...
✓ PDF-Extract-Kit-1.0 downloaded
✓ MinerU2.5-2509-1.2B downloaded
✓ Configuration saved to C:\Users\vinit\mineru.json
```

### 3. Verify Setup
```powershell
# Check config file exists
cat C:\Users\vinit\mineru.json

# Should show:
# {
#   "models-dir": {
#     "pipeline": "C:\\Users\\vinit\\.cache\\huggingface\\hub\\models--opendatalab--PDF-Extract-Kit-1.0\\...",
#     "vlm": "C:\\Users\\vinit\\.cache\\huggingface\\hub\\models--opendatalab--MinerU2.5-2509-1.2B\\..."
#   }
# }
```

## Updated Script Behavior

The `pdf_to_json_mineru_enhanced.py` script now:

1. **Looks for config at**: `C:\Users\vinit\mineru.json` (created by `mineru-models-download`)
2. **Automatically passes config**: Uses `--config C:\Users\vinit\mineru.json` flag
3. **Verifies models**: Checks that model paths exist before running
4. **No manual setup needed**: Just run `mineru-models-download` once

## Configuration File Location

### Current Setup (After mineru-models-download)
- **Config**: `C:\Users\vinit\mineru.json`
- **Models**: `C:\Users\vinit\.cache\huggingface\hub\`

### Old Setup (Deprecated)
- ~~`~/.config/mineru/mineru.json`~~ (no longer used)

## Usage

Once models are downloaded, just run:

```bash
cd scripts
python pdf_to_json_mineru_enhanced.py ../src/data/your_file.pdf
```

The script will automatically:
- Find config at `C:\Users\vinit\mineru.json`
- Use downloaded models
- Process the PDF with full capabilities

## Model Details

Downloaded models include:

### Pipeline Models (~4GB)
- **LayoutLMv3**: Document layout analysis
- **UniMERNet**: Formula recognition  
- **RapidTable**: Table extraction
- **PaddleOCR**: Text recognition

### VLM Models (~2.4GB)
- **MinerU2.5-2509-1.2B**: Vision-language model for complex documents

## Troubleshooting

### "Config not found" error
```bash
# Re-run model download
mineru-models-download
```

### "Models not found" error
```bash
# Check if models exist
ls C:\Users\vinit\.cache\huggingface\hub\

# Should see:
# models--opendatalab--PDF-Extract-Kit-1.0
# models--opendatalab--MinerU2.5-2509-1.2B
```

### Script still using old config
```bash
# Verify config path in script output
python pdf_to_json_mineru_enhanced.py test.pdf --verbose

# Should show:
# ✅ MinerU config found at: C:\Users\vinit\mineru.json
# 📄 Using config: C:\Users\vinit\mineru.json
```

## Benefits of This Setup

1. ✅ **Official tool**: Uses MinerU's recommended setup method
2. ✅ **Automatic updates**: Models stay in standard HuggingFace cache
3. ✅ **No manual config**: Everything configured by `mineru-models-download`
4. ✅ **Consistent paths**: Works across different projects
5. ✅ **Better performance**: Pre-downloaded models, no runtime downloads

## Next Steps

After setup, use MinerU for:
- PDF to JSON conversion for RAG applications
- Complex document parsing (tables, formulas, images)
- Multi-language OCR processing
- Academic paper processing

See `README_MinerU.md` for detailed usage examples.
