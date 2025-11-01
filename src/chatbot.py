from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

def initialize_chatbot():
    """Initialize the chatbot with vector store."""
    # Load existing vector store
    embeddings = OpenAIEmbeddings()
    vector_store = Chroma(
        persist_directory="./chroma_db",
        embedding_function=embeddings
    )
    
    # Create retriever
    retriever = vector_store.as_retriever(
        search_kwargs={"k": 5}  # Retrieve top 5 relevant chunks
    )
    
    return retriever

def query_chatbot(retriever, question: str) -> str:
    """Query the chatbot with context from vector store."""
    # Retrieve relevant chunks
    relevant_docs = retriever.get_relevant_documents(question)
    
    # Format context
    context = "\n\n".join([doc.page_content for doc in relevant_docs])
    
    # Create prompt with context
    prompt = f"""Based on the following Ayurvedic information, answer the question.

Context:
{context}

Question: {question}

Answer:"""
    
    # ...existing code for LLM call...
    return answer