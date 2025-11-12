import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { HttpResponseOutputParser } from 'langchain/output_parsers';
import { StreamingTextResponse } from 'ai';
import fs from 'fs';
import path from 'path';
import { 
  KnowledgeGraphBuilder, 
  GraphRAGRetriever, 
  KnowledgeGraph 
} from '../../../lib/graph-rag';

// Use Node.js runtime to support fs module
export const dynamic = 'force-dynamic';

interface RAGChunk {
  id: string;
  text: string;
  type: string;
  section?: string;
  subsection?: string;
  bbox?: number[];
  page?: number;
}

interface RAGData {
  source: string;
  title: string;
  total_pages: number;
  total_chunks: number;
  pages: {
    [key: string]: {
      page_number: number;
      chunks: RAGChunk[];
    };
  };
  extraction_stats: {
    text_chunks: number;
    table_chunks: number;
    formula_chunks: number;
  };
}

// Global instances for knowledge graph and retriever
let knowledgeGraph: KnowledgeGraph | null = null;
let graphRetriever: GraphRAGRetriever | null = null;
let ragData: RAGData | null = null;

/**
 * Initialize the knowledge graph from RAG data
 */
function initializeGraphRAG(): GraphRAGRetriever {
  if (graphRetriever) return graphRetriever;

  try {
    console.log('🚀 Initializing Graph RAG system...');
    
    // Load RAG data
    const ragPath = path.join(process.cwd(), 'src', 'data', 'ayurcheck_rag.json');
    
    if (!fs.existsSync(ragPath)) {
      throw new Error(`RAG data file not found at: ${ragPath}`);
    }
    
    const loadedData: RAGData = JSON.parse(fs.readFileSync(ragPath, 'utf-8'));
    ragData = loadedData;
    console.log(`📚 Loaded ${loadedData.total_chunks} chunks from ${loadedData.total_pages} pages`);

    // Extract all chunks for graph building
    const allChunks: { id: string; text: string }[] = [];
    for (const pageKey in loadedData.pages) {
      const page = loadedData.pages[pageKey];
      for (const chunk of page.chunks) {
        allChunks.push({
          id: chunk.id,
          text: chunk.text,
        });
      }
    }

    // Build knowledge graph
    const graphBuilder = new KnowledgeGraphBuilder();
    knowledgeGraph = graphBuilder.buildFromChunks(allChunks);
    
    // Log graph statistics
    const stats = graphBuilder.getStats();
    console.log('📊 Knowledge Graph Statistics:');
    console.log(`   - Total Entities: ${stats.totalEntities}`);
    console.log(`   - Total Relationships: ${stats.totalRelationships}`);
    console.log(`   - Entities by Type:`, stats.entitiesByType);
    console.log(`   - Relationships by Type:`, stats.relationshipsByType);

    // Create retriever
    graphRetriever = new GraphRAGRetriever(knowledgeGraph);
    
    console.log('✅ Graph RAG system initialized successfully');
    return graphRetriever;
    
  } catch (error) {
    console.error('❌ Failed to initialize Graph RAG:', error);
    throw new Error(`Failed to initialize Graph RAG system: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper function to format previous messages
 */
const formatMessage = (message: { role: string; content: string }) => {
  return `${message.role}: ${message.content}`;
};

/**
 * Get chunk text by ID
 */
function getChunkById(chunkId: string): string | null {
  if (!ragData) return null;
  
  for (const pageKey in ragData.pages) {
    const page = ragData.pages[pageKey];
    const chunk = page.chunks.find(c => c.id === chunkId);
    if (chunk) {
      return chunk.text;
    }
  }
  
  return null;
}

/**
 * POST endpoint for Graph RAG chat
 */
export async function POST(req: NextRequest) {
  try {
    // Initialize Graph RAG system
    const retriever = initializeGraphRAG();
    
    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    // Get the current question
    const currentMessage = messages[messages.length - 1];
    const question = currentMessage.content;

    // Use graph-based retrieval
    console.log(`🔍 Graph RAG search for: ${question}`);
    const retrievalResult = retriever.retrieveContext(question, 5);
    
    console.log(`✅ Found ${retrievalResult.entities.length} entities and ${retrievalResult.relationships.length} relationships`);

    // Build context from graph entities and relationships
    let graphContext = retrievalResult.contextText;

    // Add actual text from source chunks
    const chunkTexts: string[] = [];
    const sourceChunkArray = Array.from(retrievalResult.sourceChunks);
    for (const chunkId of sourceChunkArray) {
      const chunkText = getChunkById(chunkId);
      if (chunkText) {
        chunkTexts.push(chunkText);
      }
    }

    if (chunkTexts.length > 0) {
      graphContext += '\n\n=== DETAILED CONTEXT FROM SOURCE DOCUMENTS ===\n';
      graphContext += chunkTexts.slice(0, 5).join('\n\n---\n\n');
    }

    // Format previous messages for conversation history
    const formattedPreviousMessages = messages
      .slice(0, -1)
      .map(formatMessage)
      .join('\n');

    // Create the chat model
    const model = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-3.5-turbo',
      streaming: true,
      verbose: true,
    });

    // Create a custom prompt for Graph RAG
    const prompt = PromptTemplate.fromTemplate(`You are an expert in Ayurveda and traditional Indian medicine. You have access to a knowledge graph built from the Ayurvedic Pharmacopoeia, showing entities (herbs, diseases, properties, doshas) and their relationships.

CONVERSATION HISTORY:
{chat_history}

KNOWLEDGE GRAPH CONTEXT:
{context}

CURRENT QUESTION: {question}

Instructions for your response:
1. Use the knowledge graph to understand relationships between entities
2. Pay attention to the entities and relationships section to see how concepts are connected
3. Include relevant Sanskrit terms and their meanings where appropriate
4. Provide information about therapeutic properties, uses, dosage, and preparation methods when available
5. Explain how different herbs, diseases, and treatments are related based on the graph
6. If the context doesn't contain enough information, state this clearly and provide general Ayurvedic knowledge
7. Be comprehensive but practical in your recommendations
8. Always emphasize consulting with qualified Ayurvedic practitioners for medical advice

Please provide a detailed, helpful response about the Ayurvedic topic, leveraging the knowledge graph structure:`);

    // Create the processing chain
    const chain = RunnableSequence.from([
      {
        question: (input: { question: string }) => input.question,
        chat_history: () => formattedPreviousMessages,
        context: () => graphContext,
      },
      prompt,
      model,
      new HttpResponseOutputParser(),
    ]);

    // Execute the chain
    const stream = await chain.stream({
      question,
    });

    // Return the streaming response
    return new StreamingTextResponse(stream as any);

  } catch (error: any) {
    console.error('❌ Error in Graph RAG:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status ?? 500 }
    );
  }
}

/**
 * GET endpoint for health check and graph statistics
 */
export async function GET() {
  try {
    const retriever = initializeGraphRAG();
    
    // Get graph statistics
    const graphBuilder = new KnowledgeGraphBuilder();
    if (knowledgeGraph) {
      // Temporarily rebuild to get stats (in production, cache this)
      const stats = {
        totalEntities: knowledgeGraph.entities.size,
        totalRelationships: knowledgeGraph.relationships.size,
        entitiesByType: Object.fromEntries(
          Array.from(knowledgeGraph.entityIndex.entries()).map(([type, entities]) => [type, entities.size])
        ),
        relationshipsByType: (() => {
          const counts = new Map<string, number>();
          const relationships = Array.from(knowledgeGraph.relationships.values());
          for (const rel of relationships) {
            counts.set(rel.type, (counts.get(rel.type) || 0) + 1);
          }
          return Object.fromEntries(counts);
        })(),
      };

      return NextResponse.json({
        status: 'healthy',
        message: 'Graph RAG system is running',
        graph: stats,
        features: {
          graphBasedRetrieval: true,
          entityExtraction: true,
          relationshipExtraction: true,
          knowledgeGraphTraversal: true,
        },
      });
    }

    return NextResponse.json({
      status: 'error',
      message: 'Knowledge graph not initialized',
    }, { status: 500 });

  } catch (error: any) {
    console.error('❌ Health check error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}
