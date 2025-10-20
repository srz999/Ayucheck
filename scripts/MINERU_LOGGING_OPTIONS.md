# MinerU Logging and Verbosity Options

## Complete Guide to Debugging MinerU PDF Processing

This document details all available logging, debugging, and verbosity options for MinerU and its underlying components.

## Environment Variables for Logging

### MinerU-Specific Logging

#### `MINERU_LOG_LEVEL`
Controls MinerU's application-level logging.

**Values:**
- `DEBUG` - Most verbose, shows all processing steps
- `INFO` - Normal informational messages (default)
- `WARNING` - Only warnings and errors
- `ERROR` - Only error messages
- `CRITICAL` - Only critical failures

**Usage:**
```bash
# Windows PowerShell
$env:MINERU_LOG_LEVEL='DEBUG'; mineru -p input.pdf -o output

# Linux/Mac
MINERU_LOG_LEVEL=DEBUG mineru -p input.pdf -o output
```

#### `MINERU_DEBUG`
Simplified debug flag (alternative to LOG_LEVEL)

**Values:**
- `true`, `1`, `yes` - Enables DEBUG level
- Any other value - Uses default log level

**Usage:**
```bash
export MINERU_DEBUG=true
```

### ONNX Runtime Logging

MinerU uses ONNX Runtime for model inference. These environment variables control ONNX Runtime's verbosity:

#### `ORT_LOG_LEVEL`
Controls ONNX Runtime's log severity level.

**Values:**
- `0` - **Verbose** (most detailed, shows everything)
- `1` - **Info** (informational messages)
- `2` - **Warning** (warnings and errors, default)
- `3` - **Error** (only errors)
- `4` - **Fatal** (only fatal errors)

**Usage:**
```bash
# Windows PowerShell
$env:ORT_LOG_LEVEL='0'

# Linux/Mac
export ORT_LOG_LEVEL=0
```

#### `ORT_LOG_VERBOSITY`
Controls ONNX Runtime's verbosity level when `ORT_LOG_LEVEL=0`.

**Values:**
- `0` - Minimal verbose output (default)
- `1` - Detailed verbose output
- `2+` - Even more detailed (for debugging ONNX Runtime itself)

**Usage:**
```bash
# Windows PowerShell
$env:ORT_LOG_VERBOSITY='1'

# Linux/Mac
export ORT_LOG_VERBOSITY=1
```

### Model-Specific Environment Variables

#### `MINERU_DEVICE_MODE`
Specifies the inference device and affects logging about device selection.

**Values:**
- `cpu` - CPU inference
- `cuda` - NVIDIA GPU (first available)
- `cuda:0`, `cuda:1` - Specific GPU
- `npu` - Neural Processing Unit
- `mps` - Apple Silicon GPU

**Usage:**
```bash
export MINERU_DEVICE_MODE=cuda:0
```

#### `MINERU_VIRTUAL_VRAM_SIZE`
Controls GPU memory allocation (affects memory-related logging).

**Value:** Number in GB
```bash
export MINERU_VIRTUAL_VRAM_SIZE=8
```

### Formula and Table Processing

#### `MINERU_FORMULA_ENABLE`
Enable/disable formula recognition (affects processing logs).

**Values:** `true` or `false`
```bash
export MINERU_FORMULA_ENABLE=true
```

#### `MINERU_TABLE_ENABLE`
Enable/disable table recognition (affects processing logs).

**Values:** `true` or `false`
```bash
export MINERU_TABLE_ENABLE=true
```

## Command-Line Arguments

### MinerU CLI Options

```bash
mineru --help
```

**Key options for debugging:**

#### `-v, --version`
Show version and exit

#### `--verbose`
Enable verbose output (when using `pipeline` backend)

**Example:**
```bash
mineru -p input.pdf -o output --verbose
```

#### `-b, --backend`
Specify backend (affects logging output format)

**Options:**
- `pipeline` (default) - More detailed logs
- `vlm-transformers` - VLM model logs
- `vlm-vllm-engine` - vLLM engine logs
- `vlm-http-client` - HTTP client logs

#### `-d, --device`
Specify device (shows device initialization logs)

```bash
mineru -p input.pdf -o output -d cuda:0
```

#### `--config`
Specify config file path (auto-detected in our script)

```bash
mineru -p input.pdf -o output --config C:\Users\vinit\mineru.json
```

## Session Options (Python API)

If using MinerU via Python API, you can configure ONNX Runtime logging programmatically:

```python
import onnxruntime

# Set default logger severity
onnxruntime.set_default_logger_severity(0)  # 0=Verbose, 1=Info, 2=Warning, 3=Error, 4=Fatal

# Set default logger verbosity
onnxruntime.set_default_logger_verbosity(1)  # For VLOG output

# Configure session options
session_options = onnxruntime.SessionOptions()
session_options.log_severity_level = 0  # Verbose
session_options.log_verbosity_level = 1  # Detailed verbosity
session_options.enable_profiling = True  # Enable performance profiling

# Create session with options
session = onnxruntime.InferenceSession('model.onnx', session_options)
```

## Comprehensive Debug Configuration

### Maximum Verbosity (All Logs)

**Windows PowerShell:**
```powershell
$env:MINERU_LOG_LEVEL='DEBUG'
$env:MINERU_DEBUG='true'
$env:ORT_LOG_LEVEL='0'
$env:ORT_LOG_VERBOSITY='1'
$env:MINERU_DEVICE_MODE='cuda:0'

python pdf_to_json_mineru_enhanced.py input.pdf output.json --verbose
```

**Linux/Mac:**
```bash
export MINERU_LOG_LEVEL=DEBUG
export MINERU_DEBUG=true
export ORT_LOG_LEVEL=0
export ORT_LOG_VERBOSITY=1
export MINERU_DEVICE_MODE=cuda:0

python pdf_to_json_mineru_enhanced.py input.pdf output.json --verbose
```

### Updated Script Behavior

The `pdf_to_json_mineru_enhanced.py` script now automatically sets:

1. **MINERU_LOG_LEVEL=DEBUG** - MinerU verbose logging
2. **ORT_LOG_LEVEL=0** - ONNX Runtime verbose logging
3. **ORT_LOG_VERBOSITY=1** - ONNX Runtime detailed verbosity

**Output includes:**
- PDF loading and validation
- Model initialization
- Layout detection progress
- Table extraction details
- Formula recognition steps
- OCR processing
- Memory allocation
- Device selection
- ONNX Runtime graph optimization
- Inference timing
- Output generation

## Troubleshooting with Logs

### Common Log Patterns

#### Model Loading Issues
Look for:
```
Loading model from: C:\Users\vinit\.cache\huggingface\hub\...
Model loaded successfully
```

#### Device/Memory Issues
Look for:
```
CUDA device: cuda:0
Available VRAM: 8192 MB
Allocated VRAM: 4096 MB
```

#### Processing Bottlenecks
Look for timing information:
```
Layout detection: 2.5s
Table extraction: 1.2s
OCR processing: 5.8s
```

#### ONNX Runtime Optimization
With `ORT_LOG_LEVEL=0`, you'll see:
```
Graph optimization start
ORT_ENABLE_ALL optimization level
Fused nodes: 45
Optimized graph created
```

## Performance Profiling

### Enable Profiling

**Python API:**
```python
session_options = onnxruntime.SessionOptions()
session_options.enable_profiling = True
session_options.profile_file_prefix = "mineru_profile"

# After session.run(), profiling data is saved to mineru_profile_<timestamp>.json
session.end_profiling()
```

**Analyze profile:**
- Open the JSON file in Chrome://tracing or similar tools
- Shows operator-level timing
- Memory allocation patterns
- Graph execution flow

## Output Redirection

### Save Logs to File

**Windows:**
```powershell
python pdf_to_json_mineru_enhanced.py input.pdf output.json 2>&1 | Tee-Object -FilePath mineru_debug.log
```

**Linux/Mac:**
```bash
python pdf_to_json_mineru_enhanced.py input.pdf output.json 2>&1 | tee mineru_debug.log
```

### Separate stdout and stderr

```bash
# Windows PowerShell
python pdf_to_json_mineru_enhanced.py input.pdf output.json > stdout.log 2> stderr.log

# Linux/Mac  
python pdf_to_json_mineru_enhanced.py input.pdf output.json > stdout.log 2> stderr.log
```

## Log Analysis Tips

### Key Information to Look For

1. **Startup Phase:**
   - Model paths loaded from config
   - Device initialization
   - Memory allocation

2. **Processing Phase:**
   - Per-page processing time
   - Number of detected elements (tables, formulas, images)
   - OCR confidence scores

3. **ONNX Runtime:**
   - Graph optimization level
   - Execution provider selection (CUDA vs CPU)
   - Memory arena allocation

4. **Errors/Warnings:**
   - Model loading failures
   - Memory allocation issues
   - Device compatibility warnings
   - Processing timeouts

## References

- **MinerU Logging:** Based on loguru library
- **ONNX Runtime Logging:** https://onnxruntime.ai/docs/api/python/api_summary.html
- **Environment Variables:** MinerU CLI tools documentation
- **Session Options:** `onnxruntime.SessionOptions` API

## Quick Reference

| Component | Variable/Flag | Values | Default |
|-----------|---------------|--------|---------|
| MinerU | `MINERU_LOG_LEVEL` | DEBUG/INFO/WARNING/ERROR/CRITICAL | INFO |
| MinerU | `MINERU_DEBUG` | true/false | false |
| ONNX RT | `ORT_LOG_LEVEL` | 0-4 (Verbose to Fatal) | 2 |
| ONNX RT | `ORT_LOG_VERBOSITY` | 0-2+ | 0 |
| CLI | `--verbose` | flag | off |
| CLI | `-d/--device` | cpu/cuda/npu/mps | auto |
| Python | `log_severity_level` | 0-4 | 2 |
| Python | `log_verbosity_level` | 0+ | 0 |
| Python | `enable_profiling` | True/False | False |
