#!/bin/bash

# MinerU PDF to JSON Converter - Quick Start Script
# This script provides easy access to convert PDFs using MinerU

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PDF_PATH="$SCRIPT_DIR/../src/data/AyurCheck_API-Vol-1.pdf"
OUTPUT_PATH="$SCRIPT_DIR/../src/data/ayurcheck_api_vol1_mineru.json"

echo "🚀 MinerU PDF to JSON Converter"
echo "================================"

# Check if PDF exists
if [ ! -f "$PDF_PATH" ]; then
    echo "❌ Error: PDF file not found at $PDF_PATH"
    echo "Please ensure AyurCheck_API-Vol-1.pdf exists in src/data/"
    exit 1
fi

echo "📄 Input PDF: $PDF_PATH"
echo "💾 Output JSON: $OUTPUT_PATH"
echo ""

# Check Python version
python_version=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "🐍 Python version: $python_version"

if [[ $(echo "$python_version >= 3.10" | bc -l) -eq 0 ]]; then
    echo "⚠️  Warning: MinerU requires Python 3.10+. Current version: $python_version"
fi

echo ""

# Run the conversion
echo "🔄 Starting conversion with MinerU..."
echo "This may take a few minutes for complex documents..."
echo ""

python3 "$SCRIPT_DIR/pdf_to_json_mineru_enhanced.py" "$PDF_PATH" -o "$OUTPUT_PATH" --verbose

# Check if output was created
if [ -f "$OUTPUT_PATH" ]; then
    file_size=$(du -h "$OUTPUT_PATH" | cut -f1)
    echo ""
    echo "✅ Conversion completed successfully!"
    echo "📊 Output file size: $file_size"
    echo "🔍 Output location: $OUTPUT_PATH"
    
    # Show first few lines of JSON for preview
    echo ""
    echo "📋 Preview (first 10 lines):"
    echo "----------------------------"
    head -10 "$OUTPUT_PATH"
    echo "..."
else
    echo "❌ Conversion failed - no output file created"
    exit 1
fi