/**
 * Graph RAG Usage Examples
 * 
 * This file demonstrates how to use the Graph RAG system
 * for various use cases with the Ayurvedic knowledge base.
 */

// ============================================================================
// Example 1: Basic Graph RAG Query
// ============================================================================

/**
 * Simple entity-based query
 */
export async function basicGraphRAGQuery() {
  const response = await fetch('http://localhost:3000/api/graphrag', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: 'What is Amalaki and what does it treat?'
        }
      ]
    }),
  });

  // Stream the response
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      console.log('Received:', chunk);
    }
  }
}

// ============================================================================
// Example 2: Relationship-based Query
// ============================================================================

/**
 * Query asking about relationships between entities
 */
export async function relationshipQuery() {
  const response = await fetch('http://localhost:3000/api/graphrag', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: 'What herbs balance Vata dosha?'
        }
      ]
    }),
  });

  return response.body; // Return stream
}

// ============================================================================
// Example 3: Multi-turn Conversation
// ============================================================================

/**
 * Maintain conversation context across multiple queries
 */
export async function conversationExample() {
  const messages = [
    {
      role: 'user',
      content: 'Tell me about digestive herbs'
    },
    {
      role: 'assistant',
      content: 'Previous response about digestive herbs...'
    },
    {
      role: 'user',
      content: 'Which ones are anti-inflammatory?'
    }
  ];

  const response = await fetch('http://localhost:3000/api/graphrag', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  return response.body;
}

// ============================================================================
// Example 4: Graph Statistics
// ============================================================================

/**
 * Get statistics about the knowledge graph
 */
export async function getGraphStats() {
  const response = await fetch('http://localhost:3000/api/graphrag', {
    method: 'GET',
  });

  const data = await response.json();
  
  console.log('Graph Statistics:');
  console.log('================');
  console.log(`Total Entities: ${data.graph.totalEntities}`);
  console.log(`Total Relationships: ${data.graph.totalRelationships}`);
  console.log('\nEntities by Type:');
  Object.entries(data.graph.entitiesByType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  console.log('\nRelationships by Type:');
  Object.entries(data.graph.relationshipsByType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  return data;
}

// ============================================================================
// Example 5: Direct Graph RAG Library Usage
// ============================================================================

/**
 * Use the Graph RAG library directly (server-side only)
 */
export async function directLibraryUsage() {
  // Note: This example is for reference only. 
  // The actual implementation would be on the server side.
  
  /*
  import { 
    KnowledgeGraphBuilder, 
    GraphRAGRetriever 
  } from '@/lib/graph-rag';

  // Build knowledge graph
  const builder = new KnowledgeGraphBuilder();
  const graph = builder.buildFromChunks(documentChunks);

  // Create retriever
  const retriever = new GraphRAGRetriever(graph);

  // Search for entities
  const entities = retriever.findEntities('Amalaki', 5);
  console.log('Found entities:', entities);

  // Get relationships
  const relationships = retriever.getEntityRelationships(entities[0].id);
  console.log('Entity relationships:', relationships);

  // Retrieve full context for RAG
  const context = retriever.retrieveContext('What treats fever?', 5);
  console.log('Retrieved context:', {
    entities: context.entities.length,
    relationships: context.relationships.length,
    sourceChunks: context.sourceChunks.size,
  });
  */
}

// ============================================================================
// Example 6: Entity-focused Queries
// ============================================================================

/**
 * Queries that focus on specific entity types
 */
export const entityQueries = {
  // Herb queries
  herbs: [
    'What are the properties of Amalaki?',
    'Tell me about Haritaki preparation methods',
    'Which herbs are mentioned for digestive health?',
  ],

  // Disease queries
  diseases: [
    'What herbs treat fever?',
    'Ayurvedic remedies for digestive disorders',
    'Traditional treatments for respiratory conditions',
  ],

  // Dosha queries
  doshas: [
    'What herbs balance Vata dosha?',
    'Which treatments are good for Pitta?',
    'How to balance Kapha dosha?',
  ],

  // Property queries
  properties: [
    'What are anti-inflammatory herbs?',
    'Herbs with digestive properties',
    'Which plants are antipyretic?',
  ],
};

// ============================================================================
// Example 7: Comparison Between Traditional and Graph RAG
// ============================================================================

/**
 * Compare responses from traditional RAG vs Graph RAG
 */
export async function compareRAGApproaches(query: string) {
  // Query traditional RAG
  const traditionalResponse = await fetch('http://localhost:3000/api/ayurveda', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: query }]
    }),
  });

  // Query Graph RAG
  const graphResponse = await fetch('http://localhost:3000/api/graphrag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: query }]
    }),
  });

  console.log('Comparison for query:', query);
  console.log('Traditional RAG response:', await traditionalResponse.text());
  console.log('Graph RAG response:', await graphResponse.text());
}

// ============================================================================
// Example 8: Error Handling
// ============================================================================

/**
 * Proper error handling for Graph RAG requests
 */
export async function graphRAGWithErrorHandling(query: string) {
  try {
    const response = await fetch('http://localhost:3000/api/graphrag', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: query }
        ]
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Graph RAG error: ${error.error}`);
    }

    if (!response.body) {
      throw new Error('No response body received');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      fullResponse += chunk;
      console.log('Chunk:', chunk);
    }

    return fullResponse;

  } catch (error) {
    console.error('Error querying Graph RAG:', error);
    throw error;
  }
}

// ============================================================================
// Example 9: React Hook for Graph RAG
// ============================================================================

/**
 * Custom React hook for Graph RAG integration
 */
export function useGraphRAG() {
  // This would be implemented in a React component
  /*
  import { useChat } from 'ai/react';

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/graphrag',
  });

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  };
  */
}

// ============================================================================
// Example 10: Batch Query Processing
// ============================================================================

/**
 * Process multiple queries in sequence
 */
export async function batchQueryProcessing(queries: string[]) {
  const results = [];

  for (const query of queries) {
    console.log(`Processing query: ${query}`);
    
    const response = await fetch('http://localhost:3000/api/graphrag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: query }]
      }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value);
      }
    }

    results.push({
      query,
      response: fullResponse,
      timestamp: new Date().toISOString(),
    });

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}

// ============================================================================
// Usage Instructions
// ============================================================================

/*
To use these examples:

1. Start the development server:
   npm run dev

2. Run any example function:
   
   // Basic query
   await basicGraphRAGQuery();

   // Get graph statistics
   const stats = await getGraphStats();

   // Compare approaches
   await compareRAGApproaches('What is Amalaki?');

3. For batch processing:
   const queries = [
     'What herbs treat fever?',
     'Properties of Amalaki',
     'Herbs that balance Vata',
   ];
   const results = await batchQueryProcessing(queries);

4. In a React component:
   import { useChat } from 'ai/react';
   
   const { messages, input, handleSubmit } = useChat({
     api: '/api/graphrag',
   });

Note: All examples assume the server is running on localhost:3000.
For production, replace with your actual API endpoint.
*/
