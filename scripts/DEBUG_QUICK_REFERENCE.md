# 🔍 MinerU Debug Quick Reference

## 🚀 Quick Start

```bash
cd scripts
python pdf_to_json_mineru_enhanced.py input.pdf output.json
```

**The script now automatically enables maximum verbosity!**

---

## 📊 Logging Levels Quick Reference

### MinerU Log Levels
```bash
MINERU_LOG_LEVEL=DEBUG     # 🔍 Everything (most detail)
MINERU_LOG_LEVEL=INFO      # ℹ️  Normal (default)
MINERU_LOG_LEVEL=WARNING   # ⚠️  Warnings only
MINERU_LOG_LEVEL=ERROR     # ❌ Errors only
```

### ONNX Runtime Log Levels
```bash
ORT_LOG_LEVEL=0  # 🔍 Verbose (everything)
ORT_LOG_LEVEL=1  # ℹ️  Info
ORT_LOG_LEVEL=2  # ⚠️  Warning (default)
ORT_LOG_LEVEL=3  # ❌ Error
ORT_LOG_LEVEL=4  # 💀 Fatal only
```

---

## 🛠️ What the Script Now Sets Automatically

| Variable | Value | What It Does |
|----------|-------|--------------|
| `MINERU_LOG_LEVEL` | DEBUG | Shows all MinerU processing steps |
| `ORT_LOG_LEVEL` | 0 | ONNX Runtime verbose logging |
| `ORT_LOG_VERBOSITY` | 1 | Detailed ONNX Runtime output |

---

## 📝 What You'll See in Output

### ✅ Config Verification
```
✅ MinerU config found at: C:\Users\vinit\mineru.json
   Pipeline models: C:\Users\vinit\.cache\huggingface\hub\...
   VLM models: C:\Users\vinit\.cache\huggingface\hub\...
```

### 🔧 Logging Status
```
🔧 Enabled logging options:
   MINERU_LOG_LEVEL=DEBUG
   ORT_LOG_LEVEL=0 (Verbose)
   ORT_LOG_VERBOSITY=1
```

### 📄 Processing Details
- Page-by-page progress
- Layout detection
- Table extraction
- Formula recognition
- OCR processing
- Memory usage
- Timing information

---

## 🐛 Troubleshooting Commands

### Capture Everything to File
```bash
# Windows
python pdf_to_json_mineru_enhanced.py input.pdf 2>&1 | Tee-Object -FilePath debug.log

# Linux/Mac
python pdf_to_json_mineru_enhanced.py input.pdf 2>&1 | tee debug.log
```

### Run Unbuffered (Immediate Output)
```bash
python -u pdf_to_json_mineru_enhanced.py input.pdf
```

### Check MinerU Version
```bash
pip show mineru
mineru --version
```

### Verify Models Downloaded
```bash
ls C:\Users\vinit\.cache\huggingface\hub\  # Windows
ls ~/.cache/huggingface/hub/                # Linux/Mac
```

---

## 🎯 Common Issues & Solutions

### ❌ No Verbose Output?
```bash
# Try running with stderr capture
python pdf_to_json_mineru_enhanced.py input.pdf 2>&1
```

### ❌ Config Not Found?
```bash
# Check config exists
cat C:\Users\vinit\mineru.json  # Windows
cat ~/.mineru.json              # Linux/Mac

# Re-run model download
mineru-models-download
```

### ❌ Models Not Loading?
```bash
# Verify model paths in config
cat C:\Users\vinit\mineru.json

# Check models exist
dir C:\Users\vinit\.cache\huggingface\hub\models--opendatalab--*
```

### ❌ CUDA/GPU Issues?
```bash
# Check device mode
$env:MINERU_DEVICE_MODE='cpu'  # Force CPU
python pdf_to_json_mineru_enhanced.py input.pdf
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `MINERU_LOGGING_OPTIONS.md` | Complete logging reference |
| `SETUP_CHECKLIST.md` | Verify MinerU installation |
| `MINERU_SETUP_GUIDE.md` | Quick setup guide |
| `LOGGING_IMPLEMENTATION_SUMMARY.md` | What was changed |
| `README_MinerU.md` | Full MinerU documentation |

---

## 🔗 Quick Links

- **MinerU GitHub:** https://github.com/opendatalab/MinerU
- **ONNX Runtime Docs:** https://onnxruntime.ai/docs/
- **Python API:** https://onnxruntime.ai/docs/api/python/

---

## 💡 Pro Tips

1. **First run takes longer** - Models are cached after that
2. **Check stderr** - Most debug logs go there
3. **Use tee/Tee-Object** - Capture output while seeing it
4. **Monitor memory** - Large PDFs need lots of RAM
5. **GPU helps** - CUDA significantly faster than CPU

---

## 🎓 Example Outputs You Should See

### Good Config ✅
```
✅ MinerU config found at: C:\Users\vinit\mineru.json
📄 Using config: C:\Users\vinit\mineru.json
🔧 Enabled logging options:
   MINERU_LOG_LEVEL=DEBUG
   ORT_LOG_LEVEL=0 (Verbose)
```

### Bad Config ❌
```
⚠️  MinerU config not found at: C:\Users\vinit\mineru.json
   Please run 'mineru-models-download' first
```

---

**Last Updated:** 2025-01-20
**Script Version:** With comprehensive ONNX Runtime logging
