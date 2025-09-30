#!/usr/bin/env python3
"""
LangChain Integration Example for MinerU RAG Data
Demonstrates how to use the converted RAG data with LangChain for document loading and retrieval.

This script shows:
1. Loading RAG JSON data with LangChain
2. Creating embeddings and vector stores
3. Setting up retrieval chains
4. Example queries and responses

Usage:
    python langchain_rag_example.py

Requirements:
    pip install langchain langchain-community langchain-openai faiss-cpu
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Any
from dataclasses import dataclass

# LangChain imports
from langchain.docstore.document import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

@dataclass
class RAGDocument:
    """Represents a RAG document for LangChain"""
    content: str
    metadata: Dict[str, Any]
    
    def to_langchain_doc(self) -> Document:
        """Convert to LangChain Document"""
        return Document(
            page_content=self.content,
            metadata=self.metadata
        )

class AyurvedicRAGLoader:
    """Custom loader for Ayurvedic RAG data"""
    
    def __init__(self, json_path: str):
        self.json_path = Path(json_path)
        self.data = self._load_data()
    
    def _load_data(self) -> Dict[str, Any]:
        """Load the RAG JSON data"""
        if not self.json_path.exists():
            raise FileNotFoundError(f"RAG JSON file not found: {self.json_path}")
        
        with open(self.json_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def load_documents(self) -> List[Document]:
        """Load documents for LangChain"""
        documents = []
        
        for page_key, page_data in self.data.get("pages", {}).items():
            page_number = page_data.get("page_number", 0)
            
            for chunk in page_data.get("chunks", []):
                # Enhanced metadata for better retrieval
                metadata = {
                    "source": self.data.get("source", "Ayurvedic Pharmacopoeia"),
                    "title": self.data.get("title", "Unknown"),
                    "page": page_number,
                    "chunk_id": chunk.get("id", ""),
                    "type": chunk.get("type", "text"),
                    "section": chunk.get("section"),
                    "subsection": chunk.get("subsection")
                }
                
                # Add bounding box for potential highlighting
                if chunk.get("bbox"):
                    metadata["bbox"] = chunk["bbox"]
                
                # Create LangChain document
                doc = Document(
                    page_content=chunk["text"],
                    metadata=metadata
                )
                
                documents.append(doc)
        
        return documents
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the loaded data"""
        return {
            "total_pages": self.data.get("total_pages", 0),
            "total_chunks": self.data.get("total_chunks", 0),
            "extraction_stats": self.data.get("extraction_stats", {})
        }

class AyurvedicRAGSystem:
    """Complete RAG system for Ayurvedic documents"""
    
    def __init__(self, rag_json_path: str, openai_api_key: str = None):
        self.rag_json_path = rag_json_path
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        
        if not self.openai_api_key:
            raise ValueError("OpenAI API key required. Set OPENAI_API_KEY environment variable.")
        
        self.loader = AyurvedicRAGLoader(rag_json_path)
        self.documents = []
        self.vectorstore = None
        self.qa_chain = None
        
    def setup(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        """Set up the RAG system"""
        print("🔄 Loading documents...")
        self.documents = self.loader.load_documents()
        print(f"   Loaded {len(self.documents)} documents")
        
        # Optional: Further split large chunks
        if chunk_size < 2000:  # Only split if chunks are large
            print("🔄 Splitting large documents...")
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                separators=["\n\n", "\n", ".", "!", "?", ";", ":", " ", ""]
            )
            self.documents = text_splitter.split_documents(self.documents)
            print(f"   Split into {len(self.documents)} chunks")
        
        # Create embeddings
        print("🔄 Creating embeddings...")
        embeddings = OpenAIEmbeddings(openai_api_key=self.openai_api_key)
        
        # Create vector store
        print("🔄 Building vector store...")
        self.vectorstore = FAISS.from_documents(
            documents=self.documents,
            embedding=embeddings
        )
        
        # Set up QA chain with custom prompt
        print("🔄 Setting up QA chain...")
        llm = ChatOpenAI(
            temperature=0.3,
            model_name="gpt-3.5-turbo",
            openai_api_key=self.openai_api_key
        )
        
        # Custom prompt template for Ayurvedic context
        prompt_template = """You are an expert in Ayurveda and traditional Indian medicine. Use the following context from the Ayurvedic Pharmacopoeia to answer the question. Provide detailed, accurate information based on the classical Ayurvedic texts.

Context:
{context}

Question: {question}

Instructions:
1. Answer based primarily on the provided context
2. Include relevant Sanskrit terms where appropriate
3. Mention the page number and section when citing information
4. If the context doesn't contain enough information, state that clearly
5. Provide practical information about dosage, preparation, and therapeutic uses when available

Answer:"""
        
        PROMPT = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"]
        )
        
        self.qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=self.vectorstore.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 5}  # Retrieve top 5 relevant chunks
            ),
            chain_type_kwargs={"prompt": PROMPT},
            return_source_documents=True
        )
        
        print("✅ RAG system ready!")
    
    def query(self, question: str) -> Dict[str, Any]:
        """Query the RAG system"""
        if not self.qa_chain:
            raise RuntimeError("RAG system not set up. Call setup() first.")
        
        print(f"🔍 Querying: {question}")
        
        # Get answer with sources
        result = self.qa_chain({"query": question})
        
        # Process source documents
        sources = []
        for doc in result.get("source_documents", []):
            source_info = {
                "text": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                "page": doc.metadata.get("page", "Unknown"),
                "section": doc.metadata.get("section", "Unknown"),
                "type": doc.metadata.get("type", "text"),
                "chunk_id": doc.metadata.get("chunk_id", "")
            }
            sources.append(source_info)
        
        return {
            "question": question,
            "answer": result["result"],
            "sources": sources,
            "num_sources": len(sources)
        }
    
    def search_by_herb(self, herb_name: str) -> List[Dict[str, Any]]:
        """Search for specific herb information"""
        if not self.vectorstore:
            raise RuntimeError("Vector store not initialized. Call setup() first.")
        
        # Search for herb-related documents
        docs = self.vectorstore.similarity_search(
            query=f"{herb_name} synonyms properties uses",
            k=10
        )
        
        results = []
        for doc in docs:
            if herb_name.lower() in doc.page_content.lower():
                results.append({
                    "content": doc.page_content,
                    "page": doc.metadata.get("page", "Unknown"),
                    "section": doc.metadata.get("section", "Unknown"),
                    "relevance_score": "High" if herb_name in doc.page_content[:100] else "Medium"
                })
        
        return results
    
    def get_herbs_list(self) -> List[str]:
        """Extract list of herbs from the documents"""
        herbs = set()
        
        for doc in self.documents:
            content = doc.page_content.lower()
            # Look for Sanskrit/herb names (typically in title sections or start of descriptions)
            if doc.metadata.get("type") == "title" or "consists of" in content:
                # Extract potential herb names
                words = content.split()
                for word in words:
                    if len(word) > 3 and word.isalpha() and word[0].isupper():
                        herbs.add(word)
        
        return sorted(list(herbs))

def main():
    """Example usage of the Ayurvedic RAG system"""
    
    # Path to the RAG JSON file
    current_dir = Path(__file__).parent
    rag_json_path = current_dir.parent / "src" / "data" / "ayurcheck_rag.json"
    
    if not rag_json_path.exists():
        print(f"❌ RAG JSON file not found: {rag_json_path}")
        print("Please run mineru_to_rag.py first to generate the RAG data.")
        return
    
    # Check for OpenAI API key
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OpenAI API key not found!")
        print("Please set your OpenAI API key:")
        print("export OPENAI_API_KEY='your-api-key-here'")
        print("\nOr create a .env file with:")
        print("OPENAI_API_KEY=your-api-key-here")
        return
    
    try:
        # Initialize the RAG system
        print("🚀 Initializing Ayurvedic RAG System...")
        rag_system = AyurvedicRAGSystem(str(rag_json_path))
        
        # Display statistics
        stats = rag_system.loader.get_stats()
        print(f"\n📊 Document Statistics:")
        print(f"   Total pages: {stats['total_pages']}")
        print(f"   Total chunks: {stats['total_chunks']}")
        print(f"   Text chunks: {stats['extraction_stats'].get('text_chunks', 0)}")
        print(f"   Table chunks: {stats['extraction_stats'].get('table_chunks', 0)}")
        print(f"   Formula chunks: {stats['extraction_stats'].get('formula_chunks', 0)}")
        
        # Set up the system
        rag_system.setup()
        
        # Example queries
        example_queries = [
            "What is Ajagandha and what are its therapeutic uses?",
            "Tell me about Amalaki (Emblica officinalis) and its properties.",
            "What are the synonyms and preparation methods for Guggulu?",
            "How should Aragvadha be processed and what is its dose?",
            "What are the quality control standards for Ayurvedic drugs?"
        ]
        
        print("\n" + "="*80)
        print("🌿 Ayurvedic RAG System - Example Queries")
        print("="*80)
        
        for i, query in enumerate(example_queries, 1):
            print(f"\n📋 Query {i}: {query}")
            print("-" * 60)
            
            try:
                result = rag_system.query(query)
                print(f"💡 Answer:\n{result['answer']}")
                
                print(f"\n📚 Sources ({result['num_sources']} references):")
                for j, source in enumerate(result['sources'], 1):
                    print(f"   {j}. Page {source['page']} - {source['section']} ({source['type']})")
                    print(f"      \"{source['text']}\"")
                
            except Exception as e:
                print(f"❌ Error processing query: {e}")
            
            print("\n" + "-"*80)
        
        # Interactive mode
        print("\n🎯 Interactive Mode (type 'quit' to exit)")
        while True:
            try:
                user_query = input("\n❓ Ask about Ayurvedic herbs: ").strip()
                if user_query.lower() in ['quit', 'exit', 'q']:
                    break
                
                if user_query:
                    result = rag_system.query(user_query)
                    print(f"\n💡 Answer:\n{result['answer']}")
                    
                    if result['sources']:
                        print(f"\n📚 Sources:")
                        for source in result['sources'][:3]:  # Show top 3 sources
                            print(f"   • Page {source['page']} - {source['section']}")
                    
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"❌ Error: {e}")
        
        print("\n👋 Thank you for using the Ayurvedic RAG System!")
        
    except Exception as e:
        print(f"❌ Error initializing RAG system: {e}")
        print("Please check your setup and try again.")

if __name__ == "__main__":
    main()