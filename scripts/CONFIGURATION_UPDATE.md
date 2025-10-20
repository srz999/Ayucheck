# MinerU Configuration Update Summary

## Changes Made

Updated the MinerU configuration to use the official `mineru-models-download` tool and the config file at `C:\Users\vinit\mineru.json`.

## Files Modified

### 1. `scripts/pdf_to_json_mineru_enhanced.py`
**Changes:**
- Updated `MINERU_CONFIG_PATH` to point to `C:\Users\vinit\mineru.json`
- Modified `setup_mineru_config()` to check for and validate the config created by `mineru-models-download`
- Updated `run_mineru_conversion()` to automatically use the config file with `--config` flag
- Added model path verification in config validation
- Improved user feedback messages

**Key improvements:**
```python
# New config path
MINERU_CONFIG_PATH = Path(r"C:\Users\vinit\mineru.json")

# Config validation now checks for model paths
if "models-dir" in config_data:
    print(f"   Pipeline models: {config_data['models-dir'].get('pipeline')}")
    print(f"   VLM models: {config_data['models-dir'].get('vlm')}")

# Automatic config usage in conversion
if MINERU_CONFIG_PATH.exists():
    cmd.extend(["--config", str(MINERU_CONFIG_PATH)])
```

### 2. `scripts/README_MinerU.md`
**Changes:**
- Added detailed installation section with 3 steps: Install → Download Models → Verify
- Updated configuration section to document the new config file location
- Added troubleshooting for model download issues
- Removed deprecated `~/.config/mineru/mineru.json` references
- Added expected config structure with actual paths

### 3. `scripts/MINERU_SETUP_GUIDE.md` (NEW)
**Purpose:** Quick reference guide for the updated MinerU setup

**Contents:**
- 3-step setup process
- Model download details (~6.4GB total)
- Configuration file locations
- Verification steps
- Troubleshooting guide
- Benefits of the new setup

### 4. `.github/copilot-instructions.md`
**Changes:**
- Updated MinerU PDF Processing Pipeline section
- Added `mineru-models-download` as required first step
- Updated config and models locations
- Simplified processing requirements

## Configuration Details

### Current Setup (Official Method)
```
Config File: C:\Users\vinit\mineru.json
Models Dir:  C:\Users\vinit\.cache\huggingface\hub\
```

### Config Structure
```json
{
  "models-dir": {
    "pipeline": "C:\\Users\\vinit\\.cache\\huggingface\\hub\\models--opendatalab--PDF-Extract-Kit-1.0\\snapshots\\...",
    "vlm": "C:\\Users\\vinit\\.cache\\huggingface\\hub\\models--opendatalab--MinerU2.5-2509-1.2B\\snapshots\\..."
  },
  "latex-delimiter-config": { ... },
  "llm-aided-config": { ... },
  "config_version": "1.3.0"
}
```

## How It Works Now

### Before (Old Setup)
1. Run script
2. Script tries to create `~/.config/mineru/mineru.json`
3. Models downloaded during first PDF conversion
4. Inconsistent config locations

### After (New Setup)
1. Run `mineru-models-download` (one time)
2. Models downloaded (~6.4GB) to standard HuggingFace cache
3. Config created at `C:\Users\vinit\mineru.json`
4. Script automatically finds and uses config
5. All subsequent conversions use pre-downloaded models

## Benefits

1. ✅ **Official method**: Uses MinerU's recommended setup
2. ✅ **Pre-downloaded models**: No runtime downloads, faster processing
3. ✅ **Standard paths**: Uses HuggingFace cache directory
4. ✅ **Better error handling**: Clear feedback if models not found
5. ✅ **Automatic detection**: Script finds config without manual setup
6. ✅ **Version controlled**: Config version tracked in file

## Usage Example

```bash
# First time setup (ONE TIME ONLY)
pip install -U mineru[core]
mineru-models-download

# Verify setup
cat C:\Users\vinit\mineru.json

# Use anytime after setup
cd scripts
python pdf_to_json_mineru_enhanced.py ../src/data/your_file.pdf

# Output shows:
# ✅ MinerU config found at: C:\Users\vinit\mineru.json
# 📄 Using config: C:\Users\vinit\mineru.json
# ⏳ Processing PDF with downloaded models...
```

## Migration Notes

If you had the old setup:
- Old config at `~/.config/mineru/mineru.json` is no longer used
- Models in old locations can be removed (if any)
- New models are in `~/.cache/huggingface/hub/`
- Just run `mineru-models-download` to set up the new way

## Testing

To verify the changes work:

```bash
cd scripts

# This should show config found message
python pdf_to_json_mineru_enhanced.py --help

# Test with a small PDF
python pdf_to_json_mineru_enhanced.py test.pdf

# Should see:
# ✅ MinerU config found at: C:\Users\vinit\mineru.json
#    Pipeline models: C:\Users\vinit\.cache\huggingface\hub\...
#    VLM models: C:\Users\vinit\.cache\huggingface\hub\...
# 📄 Using config: C:\Users\vinit\mineru.json
```

## References

- MinerU official docs: https://github.com/opendatalab/MinerU
- Model download tool: Part of MinerU package since v2.5
- HuggingFace cache: https://huggingface.co/docs/transformers/installation#cache-setup
