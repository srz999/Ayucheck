import json
from pathlib import Path
from typing import List, Dict

def load_jsonl(file_path: Path) -> List[Dict]:
    """Load data from JSONL file."""
    data = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                data.append(json.loads(line))
    return data

def load_json(file_path: Path) -> Dict:
    """Load data from JSON file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_rag_data() -> List[Dict]:
    """Load all RAG-compatible data from both JSON and JSONL files."""
    data_dir = Path(__file__).parent.parent / "src" / "data"
    all_chunks = []
    
    # Load JSONL files (preferred format for RAG)
    jsonl_files = [
        "ayu_mentalDisorders_rag.jsonl",
        "ayu_skinDiseases_rag.jsonl"
    ]
    
    for jsonl_file in jsonl_files:
        file_path = data_dir / jsonl_file
        if file_path.exists():
            chunks = load_jsonl(file_path)
            print(f"Loaded {len(chunks)} chunks from {jsonl_file}")
            all_chunks.extend(chunks)
    
    # Optionally load JSON files as fallback
    json_files = [
        "ayu_mentalDisorders_rag.json",
        "ayu_skinDiseases_rag.json"
    ]
    
    for json_file in json_files:
        file_path = data_dir / json_file
        if file_path.exists():
            data = load_json(file_path)
            # Handle both array and object formats
            if isinstance(data, list):
                all_chunks.extend(data)
            elif isinstance(data, dict) and "chunks" in data:
                all_chunks.extend(data["chunks"])
            print(f"Loaded {len(all_chunks)} total chunks after {json_file}")
    
    return all_chunks

if __name__ == "__main__":
    chunks = load_rag_data()
    print(f"\nTotal chunks loaded: {len(chunks)}")
    if chunks:
        print(f"Sample chunk: {chunks[0]}")
