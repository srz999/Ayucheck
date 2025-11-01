from load_data import load_rag_data

def test_data_loading():
    """Test if data loads correctly."""
    chunks = load_rag_data()
    print(f"✓ Loaded {len(chunks)} chunks")
    
    # Check mental disorders data
    mental_chunks = [c for c in chunks if "mental" in c.get("text", "").lower()]
    print(f"✓ Mental health chunks: {len(mental_chunks)}")
    
    # Check skin diseases data
    skin_chunks = [c for c in chunks if "skin" in c.get("text", "").lower()]
    print(f"✓ Skin disease chunks: {len(skin_chunks)}")
    
    # Show sample
    if chunks:
        print(f"\n✓ Sample chunk:")
        print(f"  ID: {chunks[0].get('id')}")
        print(f"  Text preview: {chunks[0].get('text', '')[:100]}...")

if __name__ == "__main__":
    test_data_loading()
