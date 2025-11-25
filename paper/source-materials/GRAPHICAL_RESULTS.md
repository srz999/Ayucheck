# Experimental Results Process Flow

The following process flow describes the experimental setup used to generate results:

1.  **User Input**: When user gives an input, the Pinecone API is called and input query is processed. It searches along the indexes of Pinecone with the input.
2.  **Classifying Top-k**: Once input vector and vector data in the database have a semantic search similarity, it retrieves the top 10 results to provide information.
3.  **Input to LLM**: The OpenAI embedding parses the input into understandable chunks and provides good context.
4.  **Output Generation**: Based on input from LLM and information from Top-k semantic search, information generation is done with added citations, referencing the source document.

*Placeholder for graphs.*
Suggested Graphs:
1.  **Latency Comparison**: Bar chart comparing "Local Vector Store" vs "Pinecone Cloud" response times.
2.  **Retrieval Accuracy**: Bar chart showing "Relevant Chunks Retrieved" for Naive RAG vs MinerU RAG.
3.  **System Throughput**: Line graph showing response time vs concurrent users.
