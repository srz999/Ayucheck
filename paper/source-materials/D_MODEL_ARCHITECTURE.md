# D. Model Architecture & Technology Stack

## Technology Stack

### Core Technologies
| Technology | Purpose |
| :--- | :--- |
| **Next.js** | Full-stack framework with SSR & API routes |
| **Pinecone** | Managed vector database for semantic search |
| **LangChain** | RAG pipeline orchestration framework |

### AI Models
| Model | Purpose |
| :--- | :--- |
| **OpenAI Embeddings** | `text-embedding-3-small` (1536 dimensions) |
| **GPT-4o-mini** | Response generation with streaming |
| **MinerU** | PDF processing with structure preservation |

## Vector Database Architecture
*   **Production**: **Pinecone** (Fully managed cloud vector database).
    *   Scalable, low-latency similarity search.
*   **Verification**: **Qdrant** (Open-source).
    *   Used for local verification running over a Docker container.

## RAG Pipeline Flow
1.  **User Query**: User asks a question.
2.  **Embedding**: LangChain retrieves relevant information from Pinecone (text stored as embeddings).
3.  **Vector Search**: Semantic matching using Cosine Similarity.
    *   Formula: $cos(\theta) = \frac{q \cdot d}{||q|| \times ||d||}$
4.  **Context**: Retrieved data is combined with the user's query.
5.  **LLM**: GPT-4o-mini uses combined input to generate a final response.
6.  **Response**: Final answer grounded in training data and retrieved knowledge.
