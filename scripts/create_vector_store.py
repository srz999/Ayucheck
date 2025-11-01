# ...existing imports...
from load_data import load_rag_data

def create_documents_from_chunks(chunks: List[Dict]) -> List[Document]:
    """Convert chunks to LangChain Documents."""
    documents = []
    
    for chunk in chunks:
        # Extract text and metadata
        text = chunk.get("text", "")
        metadata = chunk.get("metadata", {})
        
        # Add chunk ID to metadata
        if "id" in chunk:
            metadata["chunk_id"] = chunk["id"]
        
        # Add document type to metadata
        if "type" in chunk:
            metadata["type"] = chunk["type"]
        
        doc = Document(
            page_content=text,
            metadata=metadata
        )
        documents.append(doc)
    
    return documents

def create_vector_store():
    """Create vector store from RAG data."""
    print("Loading RAG data...")
    chunks = load_rag_data()
    
    if not chunks:
        raise ValueError("No data loaded. Check your data files.")
    
    print(f"Creating documents from {len(chunks)} chunks...")
    documents = create_documents_from_chunks(chunks)
    
    print("Initializing embeddings...")
    embeddings = OpenAIEmbeddings()
    
    print("Creating vector store...")
    vector_store = Chroma.from_documents(
        documents=documents,
        embedding=embeddings,
        persist_directory="./chroma_db"
    )
    
    print(f"Vector store created with {len(documents)} documents")
    return vector_store

if __name__ == "__main__":
    create_vector_store()
