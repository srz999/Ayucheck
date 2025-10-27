import { NextRequest, NextResponse } from 'next/server';
import { StreamingTextResponse, createStreamDataTransformer } from 'ai';
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { Document } from '@langchain/core/documents';
import { HttpResponseOutputParser } from 'langchain/output_parsers';
import { type AyurvedaMetadata } from '../../../lib/vector-store';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Qdrant-specific configuration
const QDRANT_CONFIG = {
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  collectionName: process.env.QDRANT_COLLECTION || 'ayurveda-knowledge',
  apiKey: process.env.QDRANT_API_KEY, // Optional for local setup
  useVectorDB: true,
  vectorDBType: 'qdrant' as const,
};

// Initialize Ayurvedic RAG data for Qdrant collection
let isDataLoaded = false;

async function initializeQdrantCollection(): Promise<void> {
  if (isDataLoaded) return;

  try {
    console.log('🔄 Initializing Qdrant collection with Ayurvedic data...');
    
    // Create vector store service with Qdrant configuration
    const { VectorStoreService } = await import('../../../lib/vector-store');
    const vectorStoreService = new VectorStoreService(QDRANT_CONFIG);
    
    // Check if collection already has data
    try {
      const collectionInfo = await vectorStoreService.getCollectionInfo();
      if (collectionInfo.count > 0) {
        console.log(`✅ Collection '${QDRANT_CONFIG.collectionName}' already has ${collectionInfo.count} documents`);
        isDataLoaded = true;
        return;
      }
    } catch (error) {
      console.log('📝 Collection not found or empty, will create and populate...');
    }

    // Load Ayurvedic RAG data from JSONL format
    const dataPath = path.join(process.cwd(), 'src', 'data', 'ayurcheck_rag.jsonl');
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Ayurvedic data file not found at: ${dataPath}`);
    }

    // Parse JSONL file (each line is a JSON object)
    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const rawData = fileContent
      .trim()
      .split('\n')
      .map(line => JSON.parse(line));
    
    console.log(`📚 Loaded ${rawData.length} Ayurvedic documents from RAG data`);

    // Convert to Document format with enhanced metadata
    const documents: Document<AyurvedaMetadata>[] = rawData.map((item: any, index: number) => {
      // Get content from JSONL structure
      const content = item.text || '';
      const existingMetadata = item.metadata || {};
      
      // Enhanced metadata extraction from content
      const herbNameMatch = content.match(/(?:^|\n)([A-Z][a-z]+(?: [a-z]+)*?)(?:\s*[-–—]\s*|\s*\(|\s*:)/);
      const botanicalMatch = content.match(/\(([A-Z][a-z]+ [a-z]+(?:\s+[a-z]+)*)\)/);
      
      // Determine dosha type from content
      let doshaType: AyurvedaMetadata['dosha_type'] = undefined;
      const doshaContent = content.toLowerCase();
      if (doshaContent.includes('vata') && doshaContent.includes('pitta') && doshaContent.includes('kapha')) {
        doshaType = 'tridosha';
      } else if (doshaContent.includes('vata')) {
        doshaType = 'vata';
      } else if (doshaContent.includes('pitta')) {
        doshaType = 'pitta';
      } else if (doshaContent.includes('kapha')) {
        doshaType = 'kapha';
      }

      // Determine category from content keywords
      let category: AyurvedaMetadata['category'] = 'pharmacopoeia'; // default
      const contentLower = content.toLowerCase();
      if (contentLower.includes('herb') || contentLower.includes('plant') || botanicalMatch) {
        category = 'herb';
      } else if (contentLower.includes('remedy') || contentLower.includes('treatment')) {
        category = 'remedy';
      } else if (contentLower.includes('lifestyle') || contentLower.includes('diet') || contentLower.includes('exercise')) {
        category = 'lifestyle';
      } else if (contentLower.includes('diagnos') || contentLower.includes('symptom')) {
        category = 'diagnosis';
      }

      // Extract benefits and usage information
      const benefitsMatch = content.match(/(?:benefit|use|property|action)[s]?[:\s-]+(.*?)(?:\.|$|\n)/i);
      const usageMatch = content.match(/(?:dosage|administration|how to take|usage)[:\s-]+(.*?)(?:\.|$|\n)/i);
      const cautionMatch = content.match(/(?:caution|contraindication|side effect|warning)[s]?[:\s-]+(.*?)(?:\.|$|\n)/i);

      const metadata: AyurvedaMetadata = {
        herb_name: herbNameMatch?.[1]?.trim(),
        botanical_name: botanicalMatch?.[1]?.trim(),
        dosha_type: doshaType,
        category,
        source_document: 'Ayurvedic Pharmacopoeia Volume 1',
        page_number: existingMetadata.page || undefined,
        benefits: benefitsMatch?.[1]?.trim(),
        usage: usageMatch?.[1]?.trim(),
        caution: cautionMatch?.[1]?.trim(),
        document_id: item.id || `ayur_doc_${index}`,
        condition: undefined, // Not available in this dataset
      };

      return new Document<AyurvedaMetadata>({
        pageContent: content,
        metadata,
      });
    });

    // Add documents to Qdrant collection
    console.log(`🔧 Adding ${documents.length} documents to Qdrant collection...`);
    await vectorStoreService.addDocuments(documents);
    
    console.log('✅ Qdrant collection initialized successfully with Ayurvedic data');
    isDataLoaded = true;
  } catch (error) {
    console.error('❌ Error initializing Qdrant collection:', error);
    throw new Error(`Failed to initialize Qdrant collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Advanced RAG prompt template for Ayurvedic medicine
const ragPromptTemplate = PromptTemplate.fromTemplate(`
You are an expert Ayurvedic medicine consultant with deep knowledge of traditional Indian medicine practices. You have access to authoritative Ayurvedic texts and pharmacopoeia data through a vector database powered by Qdrant.

Context from Ayurvedic Knowledge Base:
{context}

User Question: {question}

Instructions:
- Provide accurate, evidence-based Ayurvedic guidance
- Reference specific herbs, formulations, or practices when available in the context
- Include dosha considerations (Vata, Pitta, Kapha) when relevant
- Mention botanical names when discussing herbs
- Include usage instructions, dosages, and contraindications when available
- Always emphasize consulting qualified Ayurvedic practitioners for personalized treatment
- If the context doesn't contain relevant information, state this clearly
- Maintain traditional Ayurvedic terminology while being accessible to modern readers

Answer:
`);

// Enhanced system message for Ayurvedic consultation
const SYSTEM_MESSAGE = `You are an AI assistant specialized in Ayurvedic medicine, powered by a Qdrant vector database containing comprehensive Ayurvedic pharmacopoeia data. You provide evidence-based information about traditional Indian medicine practices, herbs, treatments, and lifestyle recommendations.

Your knowledge includes:
- Ayurvedic Pharmacopoeia Volume 1 with 220+ documented herbs and formulations
- Traditional dosha theory and constitutional analysis
- Classical texts and traditional practices
- Modern applications of Ayurvedic principles

Always emphasize the importance of consulting qualified Ayurvedic practitioners for personalized treatment plans.`;

export async function POST(req: NextRequest) {
  try {
    // Initialize Qdrant collection with data (if not already done)
    await initializeQdrantCollection();

    const { messages } = await req.json();
    const userQuestion = messages[messages.length - 1]?.content || '';

    if (!userQuestion) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 });
    }

    console.log(`🔍 Processing Ayurvedic query via Qdrant: "${userQuestion}"`);

    // Create vector store service configured for Qdrant
    const { VectorStoreService } = await import('../../../lib/vector-store');
    const vectorStoreService = new VectorStoreService(QDRANT_CONFIG);

    // Perform semantic search with optional metadata filtering
    const relevantDocs = await vectorStoreService.similaritySearchWithScore(userQuestion, 5);
    
    console.log(`📊 Retrieved ${relevantDocs.length} relevant documents from Qdrant:`);
    relevantDocs.forEach(([doc, score], index) => {
      console.log(`   ${index + 1}. Score: ${score.toFixed(3)} - ${doc.pageContent.substring(0, 100)}...`);
      console.log(`      Metadata: ${JSON.stringify(doc.metadata, null, 2)}`);
    });

    // Filter results by relevance threshold
    const relevanceThreshold = 0.7;
    const filteredDocs = relevantDocs
      .filter(([_, score]) => score >= relevanceThreshold)
      .map(([doc, _]) => doc);

    if (filteredDocs.length === 0) {
      console.log('⚠️ No relevant documents found above threshold, using top results');
      filteredDocs.push(...relevantDocs.slice(0, 3).map(([doc, _]) => doc));
    }

    // Initialize OpenAI chat model for response generation
    const chatModel = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.3,
      streaming: true,
      verbose: true,
    });

    // Helper function to format documents (replaces formatDocumentsAsString)
    const formatDocs = (docs: Document[]) => {
      return docs.map(doc => doc.pageContent).join('\n\n');
    };

    // Create the RAG chain using RunnableSequence
    const ragChain = RunnableSequence.from([
      {
        context: () => formatDocs(filteredDocs),
        question: (input: { question: string }) => input.question,
      },
      ragPromptTemplate,
      chatModel,
      new HttpResponseOutputParser(),
    ]);

    // Execute the chain and stream the response
    const stream = await ragChain.stream({
      question: userQuestion,
    });

    console.log('✅ Streaming Ayurvedic response powered by Qdrant vector search');

    // Return streaming response with transformer for useChat compatibility
    return new StreamingTextResponse(
      stream.pipeThrough(createStreamDataTransformer()),
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Vector-DB': 'Qdrant',
          'X-Documents-Found': filteredDocs.length.toString(),
          'X-Collection': QDRANT_CONFIG.collectionName,
        },
      }
    );

  } catch (error) {
    console.error('❌ Error in Qdrant-powered Ayurvedic RAG endpoint:', error);
    
    // Handle specific Qdrant connection errors
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        return NextResponse.json({
          error: 'Qdrant database connection failed. Please ensure Qdrant server is running on localhost:6333',
          details: 'Run: docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant:latest',
        }, { status: 503 });
      }
      
      if (error.message.includes('Collection not found')) {
        return NextResponse.json({
          error: 'Qdrant collection not found',
          details: 'The Ayurveda knowledge collection needs to be initialized',
        }, { status: 404 });
      }
    }

    return NextResponse.json({
      error: 'Internal server error in Qdrant RAG processing',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET(req: NextRequest) {
  try {
    const { VectorStoreService } = await import('../../../lib/vector-store');
    const vectorStoreService = new VectorStoreService(QDRANT_CONFIG);
    
    const info = await vectorStoreService.getCollectionInfo();
    
    return NextResponse.json({
      status: 'healthy',
      vectorDatabase: 'Qdrant',
      collection: info.name,
      documentCount: info.count,
      qdrantUrl: QDRANT_CONFIG.url,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      qdrantUrl: QDRANT_CONFIG.url,
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}