# Ayucheck - RAG Chat Application with LangChain & Next.js

## Architecture Overview

This is a tutorial-based RAG (Retrieval Augmented Generation) application demonstrating progressive complexity from basic chat to context-aware AI responses. Ayucheck follows a learning progression with 4 example implementations:

### 1. Basic Chat Interface

- **File**: `app/page.tsx`
- **Description**: Simple chat interface using OpenAI's API for direct question-answering.

### 2. Document Question-Answering

- **File**: `app/ayurveda/page.tsx`
- **Description**: Integrates document loading and question-answering using LangChain.

### 3. Contextual RAG with Memory

- **File**: `app/ex1/page.tsx` to `app/ex3/page.tsx`
- **Description**: Progressive enhancements introducing memory and context-aware responses.

### 4. Advanced RAG with Smart Search

- **File**: `app/ex4/page.tsx` and `app/ayurveda/page.tsx`
- **Description**: Advanced integration with smart search and context formatting using MinerU data.

## Getting Started

To explore the Ayucheck RAG application:

1. **Clone the Repository**:

   ```bash
   git clone <your-repo>
   cd ayucheck
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Set Up Environment Variables**:

   Create a `.env.local` file and add your OpenAI API key:

   ```plaintext
   OPENAI_API_KEY=your_openai_key_here
   ```

4. **Run the Development Server**:

   ```bash
   npm run dev
   ```

5. **Access the Application**:

   - Basic Chat: [http://localhost:3000](http://localhost:3000)
   - Ayurvedic RAG Chat: [http://localhost:3000/ayurveda](http://localhost:3000/ayurveda)

## Project Structure

The Ayucheck project is organized as follows:

```plaintext
/ayucheck
├── /app                  # Next.js application routes
│   ├── /api              # API routes for RAG functionality
│   ├── /ayurveda         # Ayurvedic RAG Chat implementation
│   ├── /ex1              # Example 1 implementation
│   ├── /ex2              # Example 2 implementation
│   ├── /ex3              # Example 3 implementation
│   └── /ex4              # Example 4 implementation
├── /public               # Public assets
├── /scripts              # Python scripts for data processing
├── /src                  # Source files for RAG processing
├── .env.local            # Environment variables
├── package.json          # Project metadata and dependencies
└── README.md             # Project documentation
```

## RAG Implementation Details

Ayucheck's RAG implementation involves several key components:

- **Document Loading**: Using LangChain's document loaders to ingest and parse documents.
- **Embeddings**: Generating embeddings for semantic search and retrieval.
- **Retrieval Augmented Generation**: Combining retrieval and generation for context-aware responses.
- **Streaming Responses**: Implementing streaming for real-time interaction.

## Example Queries

You can try the following example queries in the Ayurvedic RAG Chat:

```
🌿 "What is Ajagandha and its therapeutic uses?"
🌿 "Tell me about Amalaki preparation methods" 
🌿 "How should Guggulu be processed and what is the dosage?"
🌿 "Quality control standards for Ayurvedic drugs"
🌿 "Traditional treatment for digestive disorders"
```

## Acknowledgments

Ayucheck is built upon the foundations of excellent tutorials and documentation:

- 📚 [Dave Gray's Courses](https://courses.davegray.codes/)  
- ✅ [YouTube Channel](https://www.youtube.com/DaveGrayTeachesCode)  
- 📺 [Original RAG Tutorial](https://youtu.be/YLagvzoWCL0)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.