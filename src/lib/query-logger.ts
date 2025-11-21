import fs from 'fs';
import path from 'path';

export interface QueryLogEntry {
  timestamp: string;
  query: string;
  sessionId: string;
  steps: LogStep[];
  results: {
    documentsRetrieved: number;
    namespacesCovered: string[];
    hybridSearchUsed: boolean;
    totalProcessingTime: number;
  };
  error?: string;
}

export interface LogStep {
  stepNumber: number;
  stepName: string;
  timestamp: string;
  duration?: number;
  details: Record<string, any>;
  output?: string;
}

export class QueryLogger {
  private logDir: string;
  private sessionId: string;
  private startTime: number;
  private steps: LogStep[] = [];
  private currentStep: number = 0;
  private query: string = '';

  constructor(query: string) {
    this.logDir = path.join(process.cwd(), 'logs', 'hybrid-rag-queries');
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.query = query;
    
    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private generateSessionId(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    return `${dateStr}_${timeStr}_${Math.random().toString(36).substring(2, 7)}`;
  }

  /**
   * Log a step in the query processing pipeline
   */
  logStep(stepName: string, details: Record<string, any>, output?: string): void {
    this.currentStep++;
    const stepTime = Date.now();
    const duration = this.steps.length > 0 
      ? stepTime - new Date(this.steps[this.steps.length - 1].timestamp).getTime()
      : stepTime - this.startTime;

    this.steps.push({
      stepNumber: this.currentStep,
      stepName,
      timestamp: new Date(stepTime).toISOString(),
      duration,
      details,
      output,
    });
  }

  /**
   * Log vector search results from Pinecone
   */
  logVectorSearch(namespaces: string[], totalMatches: number, topMatches: any[]): void {
    this.logStep('Vector Search (Pinecone)', {
      namespacesSearched: namespaces,
      totalMatchesFound: totalMatches,
      topResults: topMatches.slice(0, 5).map((match, idx) => ({
        rank: idx + 1,
        namespace: (match.metadata as any)?.namespace || 'default',
        score: match.score?.toFixed(4),
        contentPreview: this.truncate(match.metadata?.content || match.metadata?.text || '', 100),
      })),
    });
  }

  /**
   * Log BM25 keyword scoring details with IDF calculation trace
   */
  logBM25Analysis(query: string, documents: any[], idfScores?: Map<string, number>, debugInfo?: any): void {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    
    // Format IDF scores with interpretation
    let idfData: any = 'N/A';
    if (idfScores && idfScores.size > 0) {
      idfData = {};
      const sortedTerms = Array.from(idfScores.entries()).sort((a, b) => b[1] - a[1]);
      
      for (const [term, idf] of sortedTerms) {
        let classification = '';
        if (idf > 1.5) {
          classification = 'VERY RARE (highly discriminative)';
        } else if (idf > 0.8) {
          classification = 'RARE (good discriminator)';
        } else if (idf > 0.3) {
          classification = 'MODERATE (some value)';
        } else {
          classification = 'COMMON (low value)';
        }
        
        idfData[term] = {
          score: parseFloat(idf.toFixed(4)),
          classification,
          // Calculate document frequency percentage
          appearsInDocs: `~${Math.round((1 - Math.exp(-idf)) * 100)}% of documents`
        };
      }
    }
    
    // Log to file only (console disabled to reduce terminal clutter)
    this.logStep('BM25 Keyword Analysis', {
      queryTerms,
      documentCount: documents.length,
      idfScores: idfData,
      ...(debugInfo && { 
        ...(debugInfo.stopWordsFiltered && { stopWordsFiltered: debugInfo.stopWordsFiltered }),
        idfDebugTrace: debugInfo.idfCalculations,
        documentFrequencyForQueryTerms: debugInfo.documentFrequencyMap 
      }),
      bm25Parameters: {
        k1: 1.5,
        b: 0.75,
        description: 'k1 controls term frequency saturation, b controls length normalization',
        stopWordFiltering: 'Common English words excluded from BM25 scoring'
      },
    });
  }

  /**
   * Log hybrid reranking results
   */
  logHybridReranking(
    vectorWeight: number,
    results: Array<[any, number]>,
    topMatches: any[]
  ): void {
    const rerankedTop5 = results.slice(0, 5).map(([doc, hybridScore], idx) => {
      const originalMatch = topMatches.find(m => {
        const matchContent = m.metadata?.content || m.metadata?.text || '';
        const matchContentStr = typeof matchContent === 'string' ? matchContent : String(matchContent);
        return matchContentStr === doc.pageContent;
      });
      
      return {
        rank: idx + 1,
        vectorScore: originalMatch?.score?.toFixed(4) || 'N/A',
        hybridScore: hybridScore.toFixed(4),
        contentPreview: this.truncate(doc.pageContent, 100),
      };
    });

    this.logStep('Hybrid Reranking (Vector + BM25)', {
      vectorWeight: `${(vectorWeight * 100).toFixed(0)}%`,
      keywordWeight: `${((1 - vectorWeight) * 100).toFixed(0)}%`,
      resultsCount: results.length,
      topRerankedResults: rerankedTop5,
    });
  }

  /**
   * Log final filtered documents
   */
  logFilteredDocuments(
    filteredDocs: any[],
    threshold: number,
    hybridUsed: boolean
  ): void {
    this.logStep('Document Filtering', {
      relevanceThreshold: threshold,
      totalDocumentsFiltered: filteredDocs.length,
      searchMethod: hybridUsed ? 'Hybrid (Vector + BM25)' : 'Vector Only',
      selectedDocuments: filteredDocs.slice(0, 5).map((doc, idx) => ({
        rank: idx + 1,
        score: doc.score?.toFixed(4),
        namespace: (doc.metadata as any)?.namespace || 'default',
        herbName: doc.metadata?.herb_name || 'N/A',
        pageNumber: doc.metadata?.page || doc.metadata?.page_number || 'N/A',
        contentPreview: this.truncate(doc.metadata?.content || doc.metadata?.text || '', 100),
      })),
    });
  }

  /**
   * Log LLM response generation (just metadata, not full response)
   */
  logLLMGeneration(modelName: string, temperature: number, contextDocs: number): void {
    this.logStep('LLM Response Generation', {
      model: modelName,
      temperature,
      contextDocumentsProvided: contextDocs,
      streamingEnabled: true,
      promptType: 'Ayurvedic RAG with Citations',
    });
  }

  /**
   * Save the complete log to file
   */
  async saveLog(
    documentsRetrieved: number,
    namespacesCovered: string[],
    hybridSearchUsed: boolean,
    error?: string
  ): Promise<string> {
    const totalTime = Date.now() - this.startTime;
    
    const logEntry: QueryLogEntry = {
      timestamp: new Date(this.startTime).toISOString(),
      query: this.query,
      sessionId: this.sessionId,
      steps: this.steps,
      results: {
        documentsRetrieved,
        namespacesCovered,
        hybridSearchUsed,
        totalProcessingTime: totalTime,
      },
      ...(error && { error }),
    };

    const logFilePath = path.join(this.logDir, `${this.sessionId}_query.json`);
    
    try {
      fs.writeFileSync(
        logFilePath,
        JSON.stringify(logEntry, null, 2),
        'utf-8'
      );
      return logFilePath;
    } catch (writeError) {
      console.error('❌ Failed to write query log:', writeError);
      throw writeError;
    }
  }

  /**
   * Console progress indicator (minimal)
   * Only logs to console, details captured in JSON log file
   */
  progress(message: string): void {
    // Disabled: verbose logging - all details in JSON log file
    // console.log(`⏳ ${message}`);
  }

  /**
   * Console completion indicator
   */
  complete(message: string): void {
    // Keep only essential completion message
    console.log(`✅ ${message}`);
  }

  /**
   * Console error indicator
   */
  error(message: string): void {
    // Keep errors visible
    console.error(`❌ ${message}`);
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}
