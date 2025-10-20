# MinerU Logging Options - Implementation Summary

## What Was Added

Updated `pdf_to_json_mineru_enhanced.py` to include comprehensive logging and debugging options for MinerU and ONNX Runtime.

## Key Changes

### 1. Environment Variables Set by Script

The script now automatically sets these environment variables when running mineru:

```python
# MinerU logging
MINERU_LOG_LEVEL=DEBUG

# ONNX Runtime logging  
ORT_LOG_LEVEL=0        # 0=Verbose (most detailed)
ORT_LOG_VERBOSITY=1    # Detailed verbosity level
```

### 2. Command Construction

**Windows PowerShell:**
```powershell
$env:MINERU_LOG_LEVEL='DEBUG'; $env:ORT_LOG_LEVEL='0'; $env:ORT_LOG_VERBOSITY='1'; mineru -p 'file.pdf' -o 'output'
```

**Linux/Mac:**
```bash
MINERU_LOG_LEVEL=DEBUG ORT_LOG_LEVEL=0 ORT_LOG_VERBOSITY=1 mineru -p 'file.pdf' -o 'output'
```

## All Available Logging Options

### MinerU Options
| Variable | Purpose | Values | Default |
|----------|---------|--------|---------|
| `MINERU_LOG_LEVEL` | MinerU application logging | DEBUG/INFO/WARNING/ERROR/CRITICAL | INFO |
| `MINERU_DEBUG` | Simplified debug flag | true/false/1/0/yes | false |
| `MINERU_DEVICE_MODE` | Device selection | cpu/cuda/npu/mps | auto |
| `MINERU_VIRTUAL_VRAM_SIZE` | GPU memory limit (GB) | number | auto |
| `MINERU_FORMULA_ENABLE` | Formula recognition | true/false | true |
| `MINERU_TABLE_ENABLE` | Table recognition | true/false | true |

### ONNX Runtime Options
| Variable | Purpose | Values | Default |
|----------|---------|--------|---------|
| `ORT_LOG_LEVEL` | ONNX Runtime severity | 0=Verbose, 1=Info, 2=Warning, 3=Error, 4=Fatal | 2 |
| `ORT_LOG_VERBOSITY` | ONNX Runtime detail level | 0, 1, 2+ | 0 |

### Command-Line Flags
| Flag | Purpose | Backend |
|------|---------|---------|
| `--verbose` | Verbose output | pipeline only |
| `-d/--device` | Specify device | pipeline only |
| `-b/--backend` | Specify backend | all |
| `--config` | Config file path | all |

## Usage Examples

### Maximum Verbosity (Recommended for Debugging)
```bash
cd scripts
python pdf_to_json_mineru_enhanced.py ../src/data/your_file.pdf
```

The script now automatically enables all debug logging!

### Manual Environment Setup
If you want to control it manually:

**Windows:**
```powershell
$env:MINERU_LOG_LEVEL='INFO'  # Less verbose
$env:ORT_LOG_LEVEL='2'         # Warnings only
python pdf_to_json_mineru_enhanced.py input.pdf
```

**Linux/Mac:**
```bash
MINERU_LOG_LEVEL=INFO ORT_LOG_LEVEL=2 python pdf_to_json_mineru_enhanced.py input.pdf
```

## What You'll See Now

With the updated script, you'll get detailed output including:

### 1. Startup Information
```
✅ MinerU config found at: C:\Users\vinit\mineru.json
   Models downloaded via mineru-models-download are ready to use
   Pipeline models: C:\Users\vinit\.cache\huggingface\hub\...
   VLM models: C:\Users\vinit\.cache\huggingface\hub\...
📄 Using config: C:\Users\vinit\mineru.json
```

### 2. Logging Configuration
```
🔧 Enabled logging options:
   MINERU_LOG_LEVEL=DEBUG
   ORT_LOG_LEVEL=0 (Verbose)
   ORT_LOG_VERBOSITY=1
Running MinerU command with maximum verbosity
⏳ Processing PDF with downloaded models...
```

### 3. Processing Details (from MinerU)
- PDF loading and validation
- Page-by-page processing
- Layout detection
- Table extraction
- Formula recognition
- OCR processing
- Memory usage

### 4. ONNX Runtime Details
- Model loading
- Graph optimization
- Execution provider selection (CPU/CUDA)
- Operator fusion
- Memory allocation
- Inference timing

## Troubleshooting

### If you still don't see verbose output:

1. **Check MinerU version:**
   ```bash
   pip show mineru
   ```

2. **Check if loguru is suppressing output:**
   ```bash
   python -c "from loguru import logger; logger.debug('test')"
   ```

3. **Run with Python unbuffered:**
   ```bash
   python -u pdf_to_json_mineru_enhanced.py input.pdf
   ```

4. **Check stderr output:**
   Many logs go to stderr, make sure to capture both:
   ```bash
   python pdf_to_json_mineru_enhanced.py input.pdf 2>&1 | tee full_log.txt
   ```

### If specific component logs are missing:

- **No MinerU logs:** MinerU might be using a different log configuration
- **No ONNX logs:** ONNX Runtime might be compiled without verbose logging
- **No model logs:** Check if models are loading from cache (less logging)

## Documentation Files

Three new documentation files created:

1. **`MINERU_LOGGING_OPTIONS.md`** - Comprehensive guide to all logging options
2. **`SETUP_CHECKLIST.md`** - Verification checklist for MinerU setup
3. **`MINERU_SETUP_GUIDE.md`** - Quick setup guide with `mineru-models-download`

## Testing the Changes

```bash
cd scripts

# Run with maximum verbosity (now default)
python pdf_to_json_mineru_enhanced.py ../src/data/test.pdf

# Output should show:
# - Config verification
# - Logging options enabled
# - Detailed processing steps
# - ONNX Runtime optimization
# - Per-page progress
```

## Python API Usage (Advanced)

For even more control, use MinerU's Python API:

```python
import onnxruntime
import os

# Set environment variables
os.environ['MINERU_LOG_LEVEL'] = 'DEBUG'
os.environ['ORT_LOG_LEVEL'] = '0'
os.environ['ORT_LOG_VERBOSITY'] = '1'

# Configure ONNX Runtime programmatically
onnxruntime.set_default_logger_severity(0)  # Verbose
onnxruntime.set_default_logger_verbosity(1)

# Create session with options
session_options = onnxruntime.SessionOptions()
session_options.log_severity_level = 0
session_options.log_verbosity_level = 1
session_options.enable_profiling = True

# Then use MinerU's do_parse function
from mineru.cli.common import do_parse
# ... your parsing code
```

## Benefits of These Changes

1. ✅ **Complete visibility** into PDF processing pipeline
2. ✅ **ONNX Runtime details** for performance debugging
3. ✅ **Automatic configuration** - no manual env var setup needed
4. ✅ **Cross-platform** - works on Windows, Linux, Mac
5. ✅ **Flexible** - easy to adjust verbosity levels
6. ✅ **Comprehensive** - covers all logging sources

## Next Steps

1. Run the script and capture full output
2. Review logs for any errors or warnings
3. Check processing times per page
4. Verify model loading from correct paths
5. Monitor memory usage if needed

## References

- MinerU GitHub: https://github.com/opendatalab/MinerU
- ONNX Runtime Docs: https://onnxruntime.ai/docs/api/python/
- Full logging guide: `scripts/MINERU_LOGGING_OPTIONS.md`
