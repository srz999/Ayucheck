import { NextRequest, NextResponse } from 'next/server';
import { StreamingTextResponse, createStreamDataTransformer } from 'ai';
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { formatDocumentsAsString } from 'langchain/util/document';
import { HttpResponseOutputParser } from 'langchain/output_parsers';
import { Document } from 'langchain/document';
import { type AyurvedaMetadata } from '../../../lib/vector-store';
import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// Log environment variables for debugging
console.log('🔑 PINECONE_API_KEY loaded:', process.env.PINECONE_API_KEY ? `${process.env.PINECONE_API_KEY.substring(0, 10)}...` : 'NOT FOUND');
console.log('📍 PINECONE_INDEX_NAME:', process.env.PINECONE_INDEX_NAME || 'ayurveda-knowledge (default)');
console.log('🌍 PINECONE_ENVIRONMENT:', process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws (default)');

// Pinecone-specific configuration
const PINECONE_CONFIG = {
  apiKey: process.env.PINECONE_API_KEY!,
  indexName: process.env.PINECONE_INDEX_NAME || 'ayurveda-knowledge',
  environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws',
  dimension: 1536, // text-embedding-3-small dimensions
};

// Initialize Pinecone client
const pc = new Pinecone({
  apiKey: PINECONE_CONFIG.apiKey,
});

// Initialize OpenAI embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-small",
  batchSize: 512,
});

// Initialize data loading flag
let isDataLoaded = false;

async function initializePineconeIndex(): Promise<void> {
  if (isDataLoaded) return;

  try {
    console.log('🔄 Initializing Pinecone index with Ayurvedic data...');
    
    const index = pc.index(PINECONE_CONFIG.indexName);
    
    // Check if index already has data
    try {
      const stats = await index.describeIndexStats();
      if (stats.totalRecordCount && stats.totalRecordCount > 0) {
        console.log(`✅ Index '${PINECONE_CONFIG.indexName}' already has ${stats.totalRecordCount} vectors`);
        isDataLoaded = true;
        return;
      }
    } catch (error) {
      console.log('📝 Index not found or empty, will populate...');
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
      let category: AyurvedaMetadata['category'] = 'pharmacopoeia';
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

      const metadata: AyurvedaMetadata = {
        herb_name: herbNameMatch?.[1]?.trim(),
        botanical_name: botanicalMatch?.[1]?.trim(),
        dosha_type: doshaType,
        category,
        source_document: 'Ayurvedic Pharmacopoeia Volume 1',
        page_number: existingMetadata.page || undefined,
        document_id: item.id || `ayur_doc_${index}`,
      };

      return new Document<AyurvedaMetadata>({
        pageContent: content,
        metadata,
      });
    });

    // Generate embeddings for all documents
    console.log(`🧠 Generating embeddings for ${documents.length} documents...`);
    const texts = documents.map(doc => doc.pageContent);
    const documentEmbeddings = await embeddings.embedDocuments(texts);

    // Prepare vectors for Pinecone
    const vectors = documents.map((doc, i) => ({
      id: `doc_${i}_${uuidv4().slice(0, 8)}`, // Pinecone-compatible ID
      values: documentEmbeddings[i],
      metadata: {
        content: doc.pageContent,
        ...doc.metadata,
      },
    }));

    // Upload vectors to Pinecone in batches
    const batchSize = 100; // Pinecone supports larger batches than Qdrant
    console.log(`📤 Uploading ${vectors.length} vectors to Pinecone in batches of ${batchSize}...`);
    
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      console.log(`📤 Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)} with ${batch.length} vectors...`);
      
      await index.upsert(batch);
      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} uploaded successfully`);
    }

    console.log('✅ Pinecone index initialized successfully with Ayurvedic data');
    isDataLoaded = true;
  } catch (error) {
    console.error('❌ Error initializing Pinecone index:', error);
    throw new Error(`Failed to initialize Pinecone index: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Advanced RAG prompt template for Ayurvedic medicine
const ragPromptTemplate = PromptTemplate.fromTemplate(`
You are an expert Ayurvedic medicine consultant with deep knowledge of traditional Indian medicine practices. You have access to authoritative Ayurvedic texts and pharmacopoeia data through a cloud vector database powered by Pinecone.

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

export async function POST(req: NextRequest) {
  try {
    // Initialize Pinecone index with data (if not already done)
    await initializePineconeIndex();

    const { messages } = await req.json();
    const userQuestion = messages[messages.length - 1]?.content || '';

    if (!userQuestion) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 });
    }

    console.log(`🔍 Processing Ayurvedic query via Pinecone: "${userQuestion}"`);

    // Generate embedding for user query
    const queryEmbedding = await embeddings.embedQuery(userQuestion);

    // Get Pinecone index
    const index = pc.index(PINECONE_CONFIG.indexName);

    // Perform similarity search
    const searchResponse = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeValues: false,
      includeMetadata: true,
    });

    console.log(`📊 Retrieved ${searchResponse.matches?.length || 0} relevant documents from Pinecone:`);
    searchResponse.matches?.forEach((match, index) => {
      console.log(`   ${index + 1}. Score: ${match.score?.toFixed(3)} - ${(match.metadata?.content as string)?.substring(0, 100)}...`);
    });

    // Filter results by relevance threshold
    const relevanceThreshold = 0.7;
    const filteredMatches = searchResponse.matches?.filter(match => (match.score || 0) >= relevanceThreshold) || [];

    if (filteredMatches.length === 0 && searchResponse.matches) {
      console.log('⚠️ No relevant documents found above threshold, using top results');
      filteredMatches.push(...searchResponse.matches.slice(0, 3));
    }

    // Convert Pinecone matches to LangChain Documents
    const relevantDocs = filteredMatches.map(match => {
      const { content, ...metadata } = match.metadata as any;
      return new Document<AyurvedaMetadata>({
        pageContent: content,
        metadata: metadata as AyurvedaMetadata,
      });
    });

    // Initialize OpenAI chat model for response generation
    const chatModel = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.3,
      streaming: true,
      verbose: true,
    });

    // Create the RAG chain using RunnableSequence
    const ragChain = RunnableSequence.from([
      {
        context: () => formatDocumentsAsString(relevantDocs),
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

    console.log('✅ Streaming Ayurvedic response powered by Pinecone vector search');

    // Return streaming response
    return new StreamingTextResponse(
      stream.pipeThrough(createStreamDataTransformer()),
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Vector-DB': 'Pinecone',
          'X-Documents-Found': relevantDocs.length.toString(),
          'X-Index-Name': PINECONE_CONFIG.indexName,
        },
      }
    );

  } catch (error) {
    console.error('❌ Error in Pinecone-powered Ayurvedic RAG endpoint:', error);
    
    // Handle specific Pinecone errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json({
          error: 'Pinecone API key is missing or invalid',
          details: 'Please set PINECONE_API_KEY in your environment variables',
        }, { status: 401 });
      }
      
      if (error.message.includes('Index not found')) {
        return NextResponse.json({
          error: 'Pinecone index not found',
          details: `Index '${PINECONE_CONFIG.indexName}' does not exist. Please create it in Pinecone console.`,
        }, { status: 404 });
      }
    }

    return NextResponse.json({
      error: 'Internal server error in Pinecone RAG processing',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET(req: NextRequest) {
  try {
    const index = pc.index(PINECONE_CONFIG.indexName);
    const stats = await index.describeIndexStats();
    
    return NextResponse.json({
      status: 'healthy',
      vectorDatabase: 'Pinecone',
      indexName: PINECONE_CONFIG.indexName,
      vectorCount: stats.totalRecordCount || 0,
      dimension: PINECONE_CONFIG.dimension,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      indexName: PINECONE_CONFIG.indexName,
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}