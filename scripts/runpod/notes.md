# RunPod MinerU Processing Workflow
**Cost-Optimized Strategy: GPU-Heavy Processing on RunPod → Local Post-Processing**

## Connection & Setup
```bash
# Connect to RunPod GPU instance
ssh i9pls8bigs983k-644110cc@ssh.runpod.io -i ~/.ssh/id_ed25519
```

## 1. Upload PDF to RunPod
```bash
# Copy PDF to RunPod for GPU processing
scp -i ~/.ssh/id_ed25519 -P 22109 ./src/data/AyurCheck_API-Vol-1.pdf root@194.68.245.46:/workspace/
```

## 2. Run MinerU on RunPod (GPU-Heavy)
```bash
# On RunPod - run only the GPU-intensive processing
mineru -p /workspace/AyurCheck_API-Vol-1.pdf -o /workspace/output.json

# This generates:
# - content_list.json (structured content)
# - middle.json (intermediate processing)
# - model.json (layout detection)
# - images/ (extracted images)
# - .md (markdown output)
```

## 3. Download Raw Output
```bash
# Copy back ALL intermediate files for local processing
scp -i ~/.ssh/id_ed25519 -P 22109 -r root@194.68.245.46:/workspace/output.json ./
```

## 4. Local Post-Processing (CPU-Only)
```bash
# Process RunPod output locally - no GPU needed!
python scripts/process_runpod_output.py ./output.json/AyurCheck_API-Vol-1

# Create multiple variants for different use cases
python scripts/process_runpod_output.py ./output.json/AyurCheck_API-Vol-1 \
  --pdf-source ./src/data/AyurCheck_API-Vol-1.pdf \
  --output-dir ./processed_data \
  --variants

# This creates:
# - full_structured.json (RAG-ready)
# - lightweight.json (smaller file)
# - chunks.jsonl (vector DB ready)
# - document.md (human readable)
```

## Cost Benefits
- **RunPod GPU Time**: ~5-10 minutes for heavy ML processing
- **Local Processing**: Unlimited free CPU time for variants
- **Cost Savings**: 70-80% reduction vs doing everything on GPU
- **Flexibility**: Multiple output formats from single GPU run


