#!/usr/bin/env python3
"""
Run Python scripts using the MinerU virtual environment
"""

import sys
import subprocess
from pathlib import Path

VENV_PATH = Path("/Users/prabhanjanakumar/Documents/MENTOR_PAD/nextjs-rag-langchain/scripts/mineru_venv")
VENV_PYTHON = VENV_PATH / "bin" / "python"

def main():
    if len(sys.argv) < 2:
        print("Usage: python run_with_mineru_venv.py <script.py> [args...]")
        print("Example: python run_with_mineru_venv.py pdf_to_json_mineru_enhanced.py --help")
        return
    
    script_args = sys.argv[1:]
    cmd = [str(VENV_PYTHON)] + script_args
    
    print(f"🔧 Running with MinerU environment: {' '.join(cmd)}")
    subprocess.run(cmd)

if __name__ == "__main__":
    main()
