import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { formatDocumentsAsString } from 'langchain/util/document';
import { HttpResponseOutputParser } from 'langchain/output_parsers';
import { StreamingTextResponse, createStreamDataTransformer } from 'ai';
import fs from 'fs';
import path from 'path';

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

class AyurvedicRAGLoader {
  private data: RAGData;

  constructor(ragData: RAGData) {
    this.data = ragData;
  }

  searchRelevantChunks(query: string, maxChunks = 5): RAGChunk[] {
    const queryLower = query.toLowerCase();
    const relevantChunks: { chunk: RAGChunk; score: number }[] = [];

    // Search through all chunks
    for (const pageKey in this.data.pages) {
      const page = this.data.pages[pageKey];
      
      for (const chunk of page.chunks) {
        const textLower = chunk.text.toLowerCase();
        let score = 0;

        // Calculate relevance score
        const queryWords = queryLower.split(/\s+/);
        for (const word of queryWords) {
          if (word.length > 2) {
            const matches = (textLower.match(new RegExp(word, 'g')) || []).length;
            score += matches;
          }
        }

        // Boost score for title/section matches
        if (chunk.type === 'title' && textLower.includes(queryLower)) {
          score += 10;
        }

        // Boost score for section headers
        if (chunk.section && chunk.section.toLowerCase().includes(queryLower)) {
          score += 5;
        }

        if (score > 0) {
          relevantChunks.push({ chunk, score });
        }
      }
    }

    // Sort by score and return top chunks
    return relevantChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, maxChunks)
      .map(item => item.chunk);
  }

  formatChunksAsContext(chunks: RAGChunk[]): string {
    return chunks
      .map(chunk => {
        let context = chunk.text;
        
        // Add metadata for better context
        if (chunk.section) {
          context = `[Section: ${chunk.section}] ${context}`;
        }
        
        if (chunk.page) {
          context = `[Page ${chunk.page}] ${context}`;
        }

        return context;
      })
      .join('\n\n');
  }

  getStats() {
    return {
      total_pages: this.data.total_pages,
      total_chunks: this.data.total_chunks,
      extraction_stats: this.data.extraction_stats
    };
  }
}

// Load RAG data at startup
let ragLoader: AyurvedicRAGLoader | null = null;

function initializeRAGLoader(): AyurvedicRAGLoader {
  if (!ragLoader) {
    try {
      // Load the RAG JSON data
      const ragPath = path.join(process.cwd(), 'src', 'data', 'ayurcheck_rag.json');
      
      // Check if file exists
      if (!fs.existsSync(ragPath)) {
        console.error(`❌ RAG data file not found at: ${ragPath}`);
        console.log('📝 Available files in src/data/:');
        const dataDir = path.join(process.cwd(), 'src', 'data');
        if (fs.existsSync(dataDir)) {
          const files = fs.readdirSync(dataDir);
          files.forEach(file => console.log(`   - ${file}`));
        }
        throw new Error(`RAG data file not found. Please ensure ayurcheck_rag.json exists in src/data/`);
      }
      
      const ragData: RAGData = JSON.parse(fs.readFileSync(ragPath, 'utf-8'));
      ragLoader = new AyurvedicRAGLoader(ragData);
      console.log(`✅ RAG data loaded successfully: ${ragData.total_chunks} chunks from ${ragData.total_pages} pages`);
    } catch (error) {
      console.error('❌ Failed to load RAG data:', error);
      throw new Error(`Failed to initialize RAG system: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  return ragLoader;
}

// Helper function to format previous messages
const formatMessage = (message: { role: string; content: string }) => {
  return `${message.role}: ${message.content}`;
};

export async function POST(req: NextRequest) {
  try {
    // Initialize RAG loader
    const rag = initializeRAGLoader();
    
    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    // Get the current question
    const currentMessage = messages[messages.length - 1];
    const question = currentMessage.content;

    // Search for relevant chunks
    console.log(`🔍 Searching for: ${question}`);
    const relevantChunks = rag.searchRelevantChunks(question, 5);
    const context = rag.formatChunksAsContext(relevantChunks);

    console.log(`📚 Found ${relevantChunks.length} relevant chunks`);

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

    // Create a custom prompt for Ayurvedic context
    const prompt = PromptTemplate.fromTemplate(`You are an expert in Ayurveda and traditional Indian medicine. You have access to the Ayurvedic Pharmacopoeia and should provide detailed, accurate information based on classical Ayurvedic texts.

CONVERSATION HISTORY:
{chat_history}

AYURVEDIC CONTEXT:
{context}

CURRENT QUESTION: {question}

Instructions for your response:
1. Answer based primarily on the provided Ayurvedic context
2. Include relevant Sanskrit terms and their meanings where appropriate
3. Provide information about therapeutic properties, uses, dosage, and preparation methods when available
4. Mention page references or sections when citing specific information
5. If the context doesn't contain enough information, state this clearly and provide general Ayurvedic knowledge
6. Be comprehensive but practical in your recommendations
7. Always emphasize consulting with qualified Ayurvedic practitioners for medical advice

Please provide a detailed, helpful response about the Ayurvedic topic:`);

    // Create the processing chain
    const chain = RunnableSequence.from([
      {
        question: (input: { question: string }) => input.question,
        chat_history: () => formattedPreviousMessages,
        context: () => context,
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
    return new StreamingTextResponse(
      stream.pipeThrough(createStreamDataTransformer())
    );

  } catch (error: any) {
    console.error('❌ Error in Ayurvedic RAG:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' }, 
      { status: error.status ?? 500 }
    );
  }
}