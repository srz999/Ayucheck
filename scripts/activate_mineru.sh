#!/bin/bash
# Activate MinerU virtual environment and run PDF conversion

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PATH="/Users/prabhanjanakumar/Documents/MENTOR_PAD/nextjs-rag-langchain/scripts/mineru_venv"

echo "🔧 Activating MinerU virtual environment..."
source "$VENV_PATH/bin/activate"

echo "🐍 Using Python: $(which python)"
echo "📦 MinerU version: $(python -c 'import mineru; print(getattr(mineru, "__version__", "installed"))')"

# Run the conversion if PDF path is provided
if [ "$1" ]; then
    echo "🔄 Converting PDF: $1"
    python "$SCRIPT_DIR/pdf_to_json_mineru_enhanced.py" "$@"
else
    echo "📋 Usage: $0 <pdf_file> [options]"
    echo "Example: $0 ../src/data/AyurCheck_API-Vol-1.pdf -o output.json"
    echo ""
    echo "Or run Python scripts directly:"
    echo "python $SCRIPT_DIR/pdf_to_json_mineru_enhanced.py --help"
fi
