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
  if (isDataLoaded) {
    console.log('✅ Data already loaded, skipping initialization');
    return;
  }

  const startTime = Date.now();
  try {
    console.log('🔄 [INIT] Starting Pinecone index initialization...');
    console.log('🔄 [INIT] Config:', {
      indexName: PINECONE_CONFIG.indexName,
      dimension: PINECONE_CONFIG.dimension,
      apiKeyPresent: !!PINECONE_CONFIG.apiKey,
    });
    
    const index = pc.index(PINECONE_CONFIG.indexName);
    console.log('🔄 [INIT] Index object created');
    
    // Check if index already has data
    try {
      console.log('🔄 [INIT] Checking index stats...');
      const statsStartTime = Date.now();
      const stats = await index.describeIndexStats();
      console.log(`🔄 [INIT] Index stats retrieved in ${Date.now() - statsStartTime}ms:`, {
        totalRecordCount: stats.totalRecordCount,
        namespaces: stats.namespaces ? Object.keys(stats.namespaces) : [],
      });
      
      if (stats.totalRecordCount && stats.totalRecordCount > 0) {
        console.log(`✅ [INIT] Index '${PINECONE_CONFIG.indexName}' already has ${stats.totalRecordCount} vectors (${Date.now() - startTime}ms)`);
        isDataLoaded = true;
        return;
      }
    } catch (error) {
      console.error('❌ [INIT] Error checking index stats:', error instanceof Error ? error.message : error);
      console.log('📝 [INIT] Will attempt to populate index...');
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
    console.log(`🧠 [INIT] Generating embeddings for ${documents.length} documents...`);
    const embeddingStartTime = Date.now();
    const texts = documents.map(doc => doc.pageContent);
    const documentEmbeddings = await embeddings.embedDocuments(texts);
    console.log(`✅ [INIT] Embeddings generated in ${Date.now() - embeddingStartTime}ms`);

    // Prepare vectors for Pinecone
    const vectors = documents.map((doc, i) => ({
      id: `doc_${i}_${uuidv4().slice(0, 8)}`, // Pinecone-compatible ID
      values: documentEmbeddings[i],
      metadata: {
        content: doc.pageContent,
        ...doc.metadata,
      },
    }));
    console.log(`✅ [INIT] Prepared ${vectors.length} vectors for upload`);

    // Upload vectors to Pinecone in batches
    const batchSize = 100; // Pinecone supports larger batches than Qdrant
    console.log(`📤 [INIT] Uploading ${vectors.length} vectors to Pinecone in batches of ${batchSize}...`);
    
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(vectors.length / batchSize);
      console.log(`📤 [INIT] Uploading batch ${batchNum}/${totalBatches} (${batch.length} vectors)...`);
      
      const batchStartTime = Date.now();
      await index.upsert(batch);
      console.log(`✅ [INIT] Batch ${batchNum} uploaded in ${Date.now() - batchStartTime}ms`);
    }

    console.log(`✅ [INIT] Pinecone index initialized successfully with Ayurvedic data (total: ${Date.now() - startTime}ms)`);
    isDataLoaded = true;
  } catch (error) {
    console.error('❌ [INIT] Error initializing Pinecone index:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      elapsed: `${Date.now() - startTime}ms`,
    });
    throw new Error(`Failed to initialize Pinecone index: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Advanced RAG prompt template for Ayurvedic medicine with citation instructions
const ragPromptTemplate = PromptTemplate.fromTemplate(`
You are an expert Ayurvedic medicine consultant with deep knowledge of classical Indian medicine.
You are connected to an authoritative Ayurvedic knowledge base sourced from verified Ayurvedic Pharmacopoeia texts, stored in a vector database powered by Pinecone.

You are also a linguistic text normalization expert. Before responding, inspect and correct any corrupted Sanskrit transliteration characters (e.g., ¤, ¡, £, ¸, ·, ¢) into proper Romanized Sanskrit (IAST or simplified Latin) while preserving the meaning and formatting.
Do not modify English text, numbers, or citations.

Retrieved Context (with citation metadata):
{context}

User Question:
{question}

 Response Generation Rules
Grounding:

Answer strictly using the information from the above context.

Do not infer or add facts beyond what is retrieved.

If no relevant data is found, respond exactly with:

“The retrieved Ayurvedic texts do not contain specific information about [topic]. Please consult a qualified Ayurvedic practitioner for accurate guidance.”

Sanskrit Normalization:

Fix transliteration errors such as:

Am¤t¡riÀa → Amritarisha

C£r¸a → Churna

Gu·£c¢ → Guduchi

Kv¡tha → Kwath

Retain citations and English words unchanged.

Citation Rules:

Every factual statement must include inline citations in this format:
【Ayurvedic Pharmacopoeia Vol-1†[herb_name]†Page [page_number]】.

Group related data (e.g., formulations and therapeutic uses) under the same citation if they share a source.

Output Structure & Formatting (Critical for Clarity):
Always format the final response in this professional structure:

 Introduction:
A concise one-line summary restating the user’s condition or query.

 Findings (Evidence-Based Ayurvedic Information):

Provide clearly formatted explanations of relevant formulations or herbs.

Use bullet points or bold for formulations.

Present Ayurvedic names with correct transliteration and citations.

If applicable, include dosha relevance (Vata, Pitta, Kapha).

Example format:

Formulations for Jvara (Fever):

Amritarisha — used in managing Jvara and associated conditions【Ayurvedic Pharmacopoeia Vol-1†Page 66】.

Guduchi Sattva — beneficial for Prameha and Kamala【Ayurvedic Pharmacopoeia Vol-1†Page 66】.

 Recommended Dosage:

Specify the dosage clearly with units and preparation method (powder, decoction, etc.).

Example:

Powder (Churna): 3–6 g per dose

Decoction (Kwatha): 20–30 g per dose【Ayurvedic Pharmacopoeia Vol-1†Page 66】

Contraindications / Notes (if available):

Include only if explicitly present in the context.

If not found, omit this section.

 Disclaimer:
Always end with:

“Please consult a certified Ayurvedic practitioner before using any medicinal formulations.”

Tone & Style:

Maintain a professional, evidence-based tone similar to an Ayurvedic clinical handbook.

Avoid casual expressions, assumptions, or speculative claims.

Keep paragraphs compact and logically ordered.
`);

export async function POST(req: NextRequest) {
  const requestStartTime = Date.now();
  try {
    console.log('🚀 [POST] Request received at', new Date().toISOString());
    
    // Initialize Pinecone index with data (if not already done)
    console.log('🔄 [POST] Initializing Pinecone index...');
    const initStartTime = Date.now();
    await initializePineconeIndex();
    console.log(`✅ [POST] Index initialization completed in ${Date.now() - initStartTime}ms`);

    const { messages } = await req.json();
    const userQuestion = messages[messages.length - 1]?.content || '';

    if (!userQuestion) {
      console.warn('⚠️ [POST] No question provided in request');
      return NextResponse.json({ error: 'No question provided' }, { status: 400 });
    }

    console.log(`🔍 [POST] Processing query: "${userQuestion.substring(0, 100)}${userQuestion.length > 100 ? '...' : ''}"`);

    // Generate embedding for user query
    console.log('🧠 [POST] Generating query embedding...');
    const embeddingStartTime = Date.now();
    const queryEmbedding = await embeddings.embedQuery(userQuestion);
    console.log(`✅ [POST] Query embedding generated in ${Date.now() - embeddingStartTime}ms (dimension: ${queryEmbedding.length})`);

    // Get Pinecone index
    console.log('🔄 [POST] Getting Pinecone index...');
    const index = pc.index(PINECONE_CONFIG.indexName);
    console.log('✅ [POST] Index object retrieved');

    // Define all namespaces to search
    const namespaces = [
      '', // default namespace (pharmacopoeia)
      'skin-diseases',
      'skin-diseases-tables',
      'mental-disorders',
      'mental-disorders-tables',
    ];

    console.log(`🔍 [POST] Searching across ${namespaces.length} namespaces:`, namespaces);

    // Search all namespaces in parallel
    const searchStartTime = Date.now();
    const searchPromises = namespaces.map(async (ns) => {
      const nsStartTime = Date.now();
      try {
        console.log(`🔍 [SEARCH] Querying namespace: "${ns || 'default'}"`);
        const nsQuery = index.namespace(ns);
        const response = await nsQuery.query({
          vector: queryEmbedding,
          topK: 5, // Get top 5 from each namespace
          includeValues: false,
          includeMetadata: true,
        });
        
        console.log(`✅ [SEARCH] Namespace "${ns || 'default'}" returned ${response.matches?.length || 0} matches in ${Date.now() - nsStartTime}ms`);
        
        // Tag matches with namespace for debugging
        if (response.matches) {
          response.matches.forEach(match => {
            if (match.metadata) {
              (match.metadata as any).namespace = ns || 'default';
            }
          });
        }
        
        return response.matches || [];
      } catch (error) {
        console.error(`❌ [SEARCH] Error searching namespace "${ns}":`, {
          error: error instanceof Error ? error.message : error,
          elapsed: `${Date.now() - nsStartTime}ms`,
        });
        return [];
      }
    });

    // Wait for all searches to complete
    console.log('⏳ [SEARCH] Waiting for all namespace queries to complete...');
    const allMatches = (await Promise.all(searchPromises)).flat();
    console.log(`✅ [SEARCH] All searches completed in ${Date.now() - searchStartTime}ms (${allMatches.length} total matches)`);

    // Sort all matches by score (highest first)
    allMatches.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Take top 10 overall results
    const topMatches = allMatches.slice(0, 10);

    console.log(`📊 Retrieved ${allMatches.length} total documents from ${namespaces.length} namespaces:`);
    topMatches.forEach((match, index) => {
      const ns = (match.metadata as any)?.namespace || 'unknown';
      const content = (match.metadata?.content || match.metadata?.text) as string;
      console.log(`   ${index + 1}. [${ns}] Score: ${match.score?.toFixed(4)} - ${content?.substring(0, 100)}...`);
    });

    // Filter results by relevance threshold
    const relevanceThreshold = 0.35; // Lowered from 0.7 to capture table data
    const filteredMatches = topMatches.filter(match => (match.score || 0) >= relevanceThreshold) || [];

    if (filteredMatches.length === 0 && topMatches.length > 0) {
      console.log('⚠️ No relevant documents found above threshold, using top 5 results');
      filteredMatches.push(...topMatches.slice(0, 5));
    }

    // Convert Pinecone matches to LangChain Documents
    const relevantDocs = filteredMatches.map(match => {
      const metadata = match.metadata as any;
      
      // Handle different metadata structures (original vs table data)
      const pageContent = metadata.content || metadata.text || '';
      const namespace = metadata.namespace || 'default';
      
      // Construct source document based on namespace
      let sourceDocument = 'Ayurvedic Pharmacopoeia Volume 1';
      if (namespace.includes('skin-diseases')) {
        sourceDocument = 'Ayurveda Guidelines for Skin Diseases';
      } else if (namespace.includes('mental-disorders')) {
        sourceDocument = 'Ayurveda Guidelines for Mental Health';
      }
      
      // Extract clean metadata
      const cleanMetadata: AyurvedaMetadata = {
        source_document: sourceDocument,
        page_number: metadata.page || metadata.page_number,
        herb_name: metadata.herb_name,
        botanical_name: metadata.botanical_name,
        dosha_type: metadata.dosha_type,
        category: metadata.category || (metadata.type === 'table' ? 'clinical-table' as any : 'pharmacopoeia'),
        document_id: match.id,
      };
      
      return new Document<AyurvedaMetadata>({
        pageContent,
        metadata: cleanMetadata,
      });
    });

    // Helper function to format documents with citation metadata
    const formatDocsWithCitations = (docs: Document<AyurvedaMetadata>[]) => {
      return docs.map((doc, index) => {
        const metadata = doc.metadata;
        const sourceDoc = metadata.source_document || 'Ayurvedic Source';
        const pageNumber = metadata.page_number || 'N/A';
        const herbName = metadata.herb_name || 'Clinical Information';
        const botanicalName = metadata.botanical_name ? ` (${metadata.botanical_name})` : '';
        const doshaType = metadata.dosha_type ? ` [${metadata.dosha_type} balancing]` : '';
        const category = metadata.category || 'general';
        
        // Format citation based on source document type
        let citationInfo = '';
        if (sourceDoc.includes('Pharmacopoeia')) {
          citationInfo = `【Ayurvedic Pharmacopoeia Vol-1†${herbName}†Page ${pageNumber}】`;
        } else if (sourceDoc.includes('Skin Diseases')) {
          citationInfo = `【Ayurveda Guidelines for Skin Diseases†Page ${pageNumber}】`;
        } else if (sourceDoc.includes('Mental Health')) {
          citationInfo = `【Ayurveda Guidelines for Mental Health†Page ${pageNumber}】`;
        } else {
          citationInfo = `【${sourceDoc}†Page ${pageNumber}】`;
        }
        
        return `
--- Document ${index + 1} ---
Citation Info: ${citationInfo}
Source: ${sourceDoc}${herbName !== 'Clinical Information' ? `\nHerb: ${herbName}${botanicalName}${doshaType}` : ''}
Category: ${category}
Content:
${doc.pageContent}
---
`;
      }).join('\n');
    };

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
        context: () => formatDocsWithCitations(relevantDocs),
        question: (input: { question: string }) => input.question,
      },
      ragPromptTemplate,
      chatModel,
      new HttpResponseOutputParser(),
    ]);

    // Execute the chain and stream the response
    console.log('🔄 [POST] Executing RAG chain...');
    const chainStartTime = Date.now();
    const stream = await ragChain.stream({
      question: userQuestion,
    });
    console.log(`✅ [POST] RAG chain started in ${Date.now() - chainStartTime}ms`);

    console.log(`✅ [POST] Streaming response (total request time: ${Date.now() - requestStartTime}ms)`);

    // Return streaming response
    return new StreamingTextResponse(
      stream.pipeThrough(createStreamDataTransformer()),
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Vector-DB': 'Pinecone',
          'X-Documents-Found': relevantDocs.length.toString(),
          'X-Index-Name': PINECONE_CONFIG.indexName,
          'X-Request-Time-Ms': (Date.now() - requestStartTime).toString(),
        },
      }
    );

  } catch (error) {
    console.error('❌ [POST] Error in Pinecone-powered Ayurvedic RAG endpoint:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      elapsed: `${Date.now() - requestStartTime}ms`,
    });
    
    // Handle specific Pinecone errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        console.error('❌ [POST] API key error detected');
        return NextResponse.json({
          error: 'Pinecone API key is missing or invalid',
          details: 'Please set PINECONE_API_KEY in your environment variables',
        }, { status: 401 });
      }
      
      if (error.message.includes('Index not found')) {
        console.error('❌ [POST] Index not found error detected');
        return NextResponse.json({
          error: 'Pinecone index not found',
          details: `Index '${PINECONE_CONFIG.indexName}' does not exist. Please create it in Pinecone console.`,
        }, { status: 404 });
      }

      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        console.error('❌ [POST] Timeout error detected');
        return NextResponse.json({
          error: 'Request timeout',
          details: 'Pinecone request timed out. This may be due to network issues or large data uploads.',
        }, { status: 504 });
      }
    }

    return NextResponse.json({
      error: 'Internal server error in Pinecone RAG processing',
      details: error instanceof Error ? error.message : 'Unknown error',
      requestTime: `${Date.now() - requestStartTime}ms`,
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    console.log('🏥 [GET] Health check started');
    
    const index = pc.index(PINECONE_CONFIG.indexName);
    console.log('🏥 [GET] Index object retrieved');
    
    const statsStartTime = Date.now();
    const stats = await index.describeIndexStats();
    console.log(`🏥 [GET] Stats retrieved in ${Date.now() - statsStartTime}ms`);
    
    const response = {
      status: 'healthy',
      vectorDatabase: 'Pinecone',
      indexName: PINECONE_CONFIG.indexName,
      vectorCount: stats.totalRecordCount || 0,
      dimension: PINECONE_CONFIG.dimension,
      namespaces: stats.namespaces ? Object.keys(stats.namespaces) : [],
      dataLoaded: isDataLoaded,
      responseTime: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString(),
    };
    
    console.log('✅ [GET] Health check completed:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ [GET] Health check failed:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      elapsed: `${Date.now() - startTime}ms`,
    });
    
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      indexName: PINECONE_CONFIG.indexName,
      dataLoaded: isDataLoaded,
      responseTime: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}