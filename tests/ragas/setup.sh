#!/bin/bash
# Quick start script for Ragas evaluation

echo "🚀 Ayucheck Ragas Evaluation Setup"
echo "=================================="
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
else
    echo "✅ Virtual environment exists"
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📚 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Ensure your dev server is running: npm run dev"
echo "   2. Run evaluation: python evaluate_ayucheck.py --mode hybrid"
echo ""
echo "💡 To activate the environment later, run:"
echo "   source venv/bin/activate"
