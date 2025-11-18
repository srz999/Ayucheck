import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { HttpResponseOutputParser } from 'langchain/output_parsers';
import { StreamingTextResponse } from 'ai';
import fs from 'fs';
import path from 'path';
import {
  QueryClassifier,
  QueryExpander,
  HybridSearch,
  RelevanceFilter,
  ContextOptimizer,
  ResponseValidator,
} from '../../../lib/rag-enhancements';

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
  extraction_stats?: {
    text_chunks: number;
    table_chunks: number;
    formula_chunks: number;
  };
}

interface DocumentWithScore {
  chunk: RAGChunk;
  score: number;
}

/**
 * Enhanced Ayurvedic RAG Loader with multi-dataset support
 */
class EnhancedAyurvedicRAGLoader {
  private datasets: Map<string, RAGData> = new Map();
  private datasetNames: string[] = [];

  constructor(ragDatasets: { name: string; data: RAGData }[]) {
    for (const dataset of ragDatasets) {
      this.datasets.set(dataset.name, dataset.data);
      this.datasetNames.push(dataset.name);
    }
    console.log(`✅ Loaded ${this.datasets.size} datasets: ${this.datasetNames.join(', ')}`);
  }

  /**
   * Enhanced search with query classification and hybrid scoring
   */
  searchRelevantChunks(query: string, maxChunks = 5): DocumentWithScore[] {
    const queryLower = query.toLowerCase();
    
    // Step 1: Classify query to determine which datasets to search
    const recommendedDatasets = QueryClassifier.getRecommendedDatasets(query);
    const intents = QueryClassifier.classifyIntent(query);
    
    console.log(`🔍 Query classification:`);
    console.log(`   - Intents: ${intents.join(', ')}`);
    console.log(`   - Recommended datasets: ${recommendedDatasets.join(', ')}`);

    // Step 2: Expand query for better recall
    const expandedQueries = QueryExpander.expandQuery(query);
    console.log(`📝 Query expansions: ${expandedQueries.length} variations`);

    // Step 3: Search across relevant datasets
    const allResults: DocumentWithScore[] = [];
    const datasetsToSearch = this.datasetNames.filter(name => 
      recommendedDatasets.some(rec => name.includes(rec.replace('.json', '')))
    );

    // If no specific dataset matched, search all
    const searchDatasets = datasetsToSearch.length > 0 ? datasetsToSearch : this.datasetNames;

    for (const datasetName of searchDatasets) {
      const data = this.datasets.get(datasetName);
      if (!data) continue;

      console.log(`🔎 Searching dataset: ${datasetName}`);
      
      // Search with original and expanded queries
      for (const expandedQuery of expandedQueries.slice(0, 3)) { // Limit expansions
        const results = this.searchDataset(data, expandedQuery, datasetName);
        allResults.push(...results);
      }
    }

    // Step 4: Apply hybrid re-ranking
    const rankedResults = this.rerankWithHybridSearch(query, allResults);

    // Step 5: Filter by relevance
    const relevantResults = rankedResults.filter(result => 
      result.score > 0.1 && // Minimum threshold
      RelevanceFilter.isRelevant(query, result.chunk.text, result.score)
    );

    console.log(`📊 Search results:`);
    console.log(`   - Total found: ${allResults.length}`);
    console.log(`   - After ranking: ${rankedResults.length}`);
    console.log(`   - After filtering: ${relevantResults.length}`);

    // Step 6: Return top chunks
    const topResults = relevantResults.slice(0, maxChunks);
    
    if (topResults.length === 0) {
      console.log('⚠️ No relevant documents found for query');
    } else {
      console.log(`✅ Returning ${topResults.length} most relevant chunks`);
      topResults.forEach((result, idx) => {
        console.log(`   ${idx + 1}. Score: ${result.score.toFixed(3)} - ${result.chunk.text.substring(0, 80)}...`);
      });
    }

    return topResults;
  }

  /**
   * Search within a single dataset
   */
  private searchDataset(
    data: RAGData, 
    query: string, 
    datasetName: string
  ): DocumentWithScore[] {
    const queryLower = query.toLowerCase();
    const results: DocumentWithScore[] = [];

    for (const pageKey in data.pages) {
      const page = data.pages[pageKey];
      
      for (const chunk of page.chunks) {
        const textLower = chunk.text.toLowerCase();
        
        // Calculate semantic similarity score (keyword-based approximation)
        let score = this.calculateSemanticScore(queryLower, textLower);

        // Boost score for title/section matches
        if (chunk.type === 'title' && textLower.includes(queryLower)) {
          score += 0.3;
        }
        if (chunk.section && chunk.section.toLowerCase().includes(queryLower)) {
          score += 0.2;
        }

        if (score > 0) {
          results.push({
            chunk: {
              ...chunk,
              // Add dataset source to chunk for attribution
              section: chunk.section || `From ${datasetName}`
            },
            score
          });
        }
      }
    }

    return results;
  }

  /**
   * Calculate semantic similarity score (keyword-based approximation)
   */
  private calculateSemanticScore(query: string, text: string): number {
    const queryWords = query.split(/\s+/).filter(w => w.length > 2);
    const textWords = new Set(text.split(/\s+/).map(w => w.toLowerCase()));
    const textWordsArray = Array.from(textWords);
    
    let matches = 0;
    let totalWeight = 0;

    for (const word of queryWords) {
      const weight = Math.log(word.length); // Longer words are more significant
      totalWeight += weight;
      
      if (textWords.has(word)) {
        matches += weight;
      } else {
        // Check for partial matches (stemming approximation)
        const stem = word.substring(0, Math.max(4, word.length - 2));
        for (const textWord of textWordsArray) {
          if (textWord.startsWith(stem)) {
            matches += weight * 0.5; // Partial match worth half
            break;
          }
        }
      }
    }

    return totalWeight > 0 ? matches / totalWeight : 0;
  }

  /**
   * Re-rank results using hybrid search
   */
  private rerankWithHybridSearch(
    query: string, 
    results: DocumentWithScore[]
  ): DocumentWithScore[] {
    // Calculate keyword scores for all results
    const withKeywordScores = results.map(result => {
      const keywordScore = HybridSearch.calculateKeywordScore(query, result.chunk.text);
      const normalizedKeywordScore = Math.min(keywordScore / 10, 1.0);
      
      // Combine semantic (original score) and keyword scores
      const hybridScore = HybridSearch.combineScores(
        result.score,
        normalizedKeywordScore,
        0.7 // 70% semantic, 30% keyword
      );

      return {
        chunk: result.chunk,
        score: hybridScore
      };
    });

    // Sort by hybrid score
    return withKeywordScores.sort((a, b) => b.score - a.score);
  }

  /**
   * Format chunks as context with enhanced metadata
   */
  formatChunksAsContext(chunks: DocumentWithScore[]): string {
    return chunks
      .map((item, idx) => {
        let context = `--- Document ${idx + 1} (Relevance: ${(item.score * 100).toFixed(1)}%) ---\n`;
        
        if (item.chunk.section) {
          context += `Section: ${item.chunk.section}\n`;
        }
        if (item.chunk.page) {
          context += `Page: ${item.chunk.page}\n`;
        }
        if (item.chunk.type) {
          context += `Type: ${item.chunk.type}\n`;
        }
        
        context += `\n${item.chunk.text}\n`;
        
        return context;
      })
      .join('\n\n');
  }

  getStats() {
    const totalChunks = Array.from(this.datasets.values()).reduce(
      (sum, data) => sum + data.total_chunks, 0
    );
    
    return {
      datasets: this.datasets.size,
      total_chunks: totalChunks,
      dataset_names: this.datasetNames
    };
  }
}

// Cache for loaded datasets
let ragLoader: EnhancedAyurvedicRAGLoader | null = null;

/**
 * Initialize Enhanced RAG Loader with multiple datasets
 */
function initializeEnhancedRAGLoader(): EnhancedAyurvedicRAGLoader {
  if (!ragLoader) {
    try {
      const dataDir = path.join(process.cwd(), 'src', 'data');
      
      // Load all available RAG datasets
      const datasetFiles = [
        'ayurcheck_rag.json',           // Pharmacopoeia
        'ayu_skinDiseases_rag.json',    // Skin diseases
        'ayu_mentalDisorders_rag.json'  // Mental disorders
      ];

      const datasets: { name: string; data: RAGData }[] = [];

      for (const filename of datasetFiles) {
        const filePath = path.join(dataDir, filename);
        
        if (fs.existsSync(filePath)) {
          try {
            const ragData: RAGData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            datasets.push({ name: filename, data: ragData });
            console.log(`✅ Loaded ${filename}: ${ragData.total_chunks} chunks from ${ragData.total_pages} pages`);
          } catch (error) {
            console.warn(`⚠️ Failed to load ${filename}:`, error);
          }
        } else {
          console.log(`ℹ️ Dataset not found: ${filename}`);
        }
      }

      if (datasets.length === 0) {
        throw new Error('No RAG datasets found. Please ensure at least one dataset exists in src/data/');
      }

      ragLoader = new EnhancedAyurvedicRAGLoader(datasets);
      console.log(`🎉 Enhanced RAG initialized with ${datasets.length} datasets`);
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced RAG:', error);
      throw error;
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
    // Initialize Enhanced RAG loader
    const rag = initializeEnhancedRAGLoader();
    
    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    // Get the current question
    const currentMessage = messages[messages.length - 1];
    const question = currentMessage.content;

    // Search for relevant chunks with enhanced retrieval
    console.log(`\n🔍 Enhanced search for: "${question}"`);
    const relevantChunks = rag.searchRelevantChunks(question, 8); // Get more chunks for better context

    // Check if we have relevant results
    if (relevantChunks.length === 0) {
      return NextResponse.json({
        message: "I apologize, but I don't have specific information about this topic in my current knowledge base. The available datasets cover Ayurvedic Pharmacopoeia, skin diseases, and mental disorders. Please consult a qualified Ayurvedic practitioner for personalized guidance.",
        query: question,
        documentsFound: 0
      }, { status: 200 });
    }

    // Filter out low-confidence results
    const highConfidenceChunks = relevantChunks.filter(item => item.score > 0.3);
    
    if (highConfidenceChunks.length === 0) {
      console.log('⚠️ No high-confidence results found');
      return NextResponse.json({
        message: "I found some potentially related information, but the confidence is too low to provide a reliable answer. Please rephrase your question or consult a qualified Ayurvedic practitioner.",
        query: question,
        documentsFound: relevantChunks.length,
        maxConfidence: Math.max(...relevantChunks.map(c => c.score))
      }, { status: 200 });
    }

    const context = rag.formatChunksAsContext(highConfidenceChunks);
    console.log(`📚 Using ${highConfidenceChunks.length} high-confidence chunks for context`);

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
      verbose: false,
      temperature: 0.3, // Lower temperature for more factual responses
    });

    // Enhanced prompt with grounding instructions
    const prompt = PromptTemplate.fromTemplate(`You are an expert in Ayurveda and traditional Indian medicine. You have access to the Ayurvedic knowledge base and should provide accurate, evidence-based information.

CONVERSATION HISTORY:
{chat_history}

AYURVEDIC CONTEXT (Retrieved from Knowledge Base):
{context}

CURRENT QUESTION: {question}

**CRITICAL GROUNDING RULES:**
1. Answer ONLY based on the provided Ayurvedic context above
2. If the context doesn't contain relevant information, clearly state: "The available texts don't contain specific information about this topic"
3. DO NOT generate recommendations from general knowledge if not in the context
4. Include relevant Sanskrit terms and their meanings when present in the context
5. Cite the source document, page number, and section when referencing information
6. Provide information about therapeutic properties, dosage, and preparation methods ONLY if present in context
7. Always emphasize consulting qualified Ayurvedic practitioners for medical advice
8. If context is from pharmacopoeia (lab testing), state it's technical/reference information, not treatment advice

Response guidelines:
- Be comprehensive but stay grounded in the provided context
- Use the citation format: [Source: page X, section Y]
- Mention the confidence level if the context is limited
- Suggest related topics if the exact answer isn't in the context

Please provide a detailed, grounded response:`);

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
    const stream = await chain.stream({ question });

    // Return the streaming response
    return new StreamingTextResponse(stream as any);

  } catch (error: any) {
    console.error('❌ Error in Enhanced Ayurvedic RAG:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 
      { status: error.status ?? 500 }
    );
  }
}

/**
 * GET endpoint for health check and system information
 */
export async function GET() {
  try {
    const rag = initializeEnhancedRAGLoader();
    const stats = rag.getStats();
    
    return NextResponse.json({
      status: 'healthy',
      version: 'enhanced-v1',
      features: {
        multiDataset: true,
        queryClassification: true,
        hybridSearch: true,
        queryExpansion: true,
        relevanceFiltering: true,
        groundingValidation: true
      },
      datasets: stats,
      message: 'Enhanced Ayurvedic RAG system with multi-dataset support and advanced retrieval'
    });
  } catch (error: any) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}
