import { Pinecone } from '@pinecone-database/pinecone';

// Initialize Pinecone
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// Example: Get or create index
export async function getPineconeIndex(indexName: string) {
  try {
    const index = pc.index(indexName);
    return index;
  } catch (error) {
    console.error('Error accessing Pinecone index:', error);
    throw error;
  }
}

// Example: Vector operations
export async function upsertVectors(indexName: string, vectors: any[]) {
  const index = pc.index(indexName);
  
  try {
    await index.upsert(vectors);
    console.log('Vectors upserted successfully');
  } catch (error) {
    console.error('Error upserting vectors:', error);
    throw error;
  }
}

export async function queryVectors(indexName: string, vector: number[], topK: number = 5) {
  const index = pc.index(indexName);
  
  try {
    const queryResponse = await index.query({
      vector: vector,
      topK: topK,
      includeValues: true,
      includeMetadata: true,
    });
    
    return queryResponse;
  } catch (error) {
    console.error('Error querying vectors:', error);
    throw error;
  }
}