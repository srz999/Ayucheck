# ✅ MinerU Configuration Checklist

## Quick Verification

Use this checklist to ensure MinerU is properly configured:

### Step 1: Check if MinerU is installed
```bash
python -c "import mineru; print('MinerU installed')"
```
- ✅ Shows "MinerU installed"
- ❌ Error → Run `pip install -U mineru[core]`

### Step 2: Check if models are downloaded
```bash
# Windows
dir C:\Users\vinit\.cache\huggingface\hub\

# Linux/Mac
ls ~/.cache/huggingface/hub/
```
- ✅ Should see folders like:
  - `models--opendatalab--PDF-Extract-Kit-1.0`
  - `models--opendatalab--MinerU2.5-2509-1.2B`
- ❌ Not found → Run `mineru-models-download`

### Step 3: Check if config file exists
```bash
# Windows
cat C:\Users\vinit\mineru.json

# Linux/Mac  
cat ~/.mineru.json
```
- ✅ File exists with `models-dir` section
- ❌ Not found → Run `mineru-models-download`

### Step 4: Verify config content
Config should contain:
```json
{
  "models-dir": {
    "pipeline": "C:\\Users\\vinit\\.cache\\huggingface\\hub\\models--...",
    "vlm": "C:\\Users\\vinit\\.cache\\huggingface\\hub\\models--..."
  }
}
```
- ✅ Both `pipeline` and `vlm` paths present
- ❌ Missing paths → Re-run `mineru-models-download`

### Step 5: Test the script
```bash
cd scripts
python pdf_to_json_mineru_enhanced.py
```
Expected output:
```
✅ MinerU config found at: C:\Users\vinit\mineru.json
   Models downloaded via mineru-models-download are ready to use
   Pipeline models: C:\Users\vinit\.cache\huggingface\hub\models--opendatalab--PDF-Extract-Kit-1.0\...
   VLM models: C:\Users\vinit\.cache\huggingface\hub\models--opendatalab--MinerU2.5-2509-1.2B\...
```
- ✅ All green checkmarks
- ❌ Warning messages → Follow the instructions shown

## Complete Setup (If Starting Fresh)

```bash
# 1. Install MinerU
pip install -U mineru[core]

# 2. Download models (takes 10-15 minutes)
mineru-models-download

# 3. Verify installation
cat C:\Users\vinit\mineru.json  # Windows
cat ~/.mineru.json              # Linux/Mac

# 4. Test conversion
cd scripts
python pdf_to_json_mineru_enhanced.py test.pdf
```

## Troubleshooting

### ❌ "Config not found" error
```bash
# Run model download
mineru-models-download

# Verify file created
cat C:\Users\vinit\mineru.json
```

### ❌ "Models not found" error
```bash
# Check HuggingFace cache
ls C:\Users\vinit\.cache\huggingface\hub\  # Windows
ls ~/.cache/huggingface/hub/               # Linux/Mac

# If empty, re-run
mineru-models-download
```

### ❌ "Permission denied" error
```bash
# Windows: Run as administrator
# Linux/Mac: Check folder permissions
chmod -R u+w ~/.cache/huggingface/
```

### ❌ Download interrupted/incomplete
```bash
# Clear cache and retry
rm -rf ~/.cache/huggingface/hub/models--opendatalab--*
mineru-models-download
```

## System Requirements

- ✅ Python 3.10+
- ✅ 16GB+ RAM
- ✅ 20GB+ free disk space
- ✅ Stable internet connection (for initial download)

## File Locations Reference

| Component | Windows | Linux/Mac |
|-----------|---------|-----------|
| Config | `C:\Users\vinit\mineru.json` | `~/.mineru.json` |
| Models | `C:\Users\vinit\.cache\huggingface\hub\` | `~/.cache/huggingface/hub/` |
| Script | `scripts/pdf_to_json_mineru_enhanced.py` | Same |

## What Each File Contains

### `mineru.json` (~1 KB)
- Model paths
- LaTeX delimiters config
- LLM-aided config (optional)

### `models--opendatalab--PDF-Extract-Kit-1.0` (~4 GB)
- LayoutLMv3 for layout analysis
- UniMERNet for formula recognition
- RapidTable for table extraction
- PaddleOCR for text recognition

### `models--opendatalab--MinerU2.5-2509-1.2B` (~2.4 GB)
- Vision-language model for complex documents
- Image understanding capabilities

## Success Indicators

When everything is working:

1. ✅ Config file shows correct model paths
2. ✅ Models are in HuggingFace cache
3. ✅ Script shows "Models downloaded via mineru-models-download are ready"
4. ✅ PDF conversion runs without downloading anything
5. ✅ Processing time is consistent (not slower on first run)

## Next Steps After Setup

Once all checkmarks are green:
1. Process PDFs: `python pdf_to_json_mineru_enhanced.py input.pdf output.json`
2. Create RAG data: `python mineru_to_rag.py output.json`
3. Use in Next.js: Import processed data in `api/ayurveda/route.ts`

## Getting Help

If issues persist:
1. Check `scripts/MINERU_SETUP_GUIDE.md` for detailed setup
2. Review `scripts/README_MinerU.md` for usage examples
3. See `scripts/CONFIGURATION_UPDATE.md` for what changed
4. Check MinerU docs: https://github.com/opendatalab/MinerU
