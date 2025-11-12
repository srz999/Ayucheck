/**
 * RAG Enhancement Utilities
 * 
 * This module provides advanced RAG capabilities:
 * - Query classification and intent detection
 * - Hybrid search (semantic + keyword)
 * - Query expansion
 * - Re-ranking algorithms
 * - Citation verification
 */

import { Document } from "@langchain/core/documents";

// Query intent types for routing
export type QueryIntent = 
  | 'clinical_treatment'    // Seeking treatment for a condition
  | 'herb_properties'       // Information about specific herbs
  | 'diagnostic'            // Symptom analysis and diagnosis
  | 'pharmacopoeia'         // Drug preparation and testing
  | 'lifestyle'             // Diet and lifestyle recommendations
  | 'general';              // General Ayurvedic knowledge

// Domain classification for dataset routing
export type DomainType = 
  | 'skin_diseases'
  | 'mental_disorders'
  | 'pharmacopoeia'
  | 'general';

/**
 * Query Classifier
 * Analyzes user query to determine intent and appropriate data sources
 */
export class QueryClassifier {
  private static clinicalKeywords = [
    'treatment', 'cure', 'remedy', 'heal', 'disease', 'disorder', 'condition',
    'pain', 'symptom', 'suffering', 'problem', 'issue', 'rash', 'infection',
    'inflammation', 'fever', 'cold', 'cough', 'anxiety', 'depression', 'stress'
  ];

  private static herbKeywords = [
    'herb', 'plant', 'botanical', 'medicine', 'drug', 'formulation',
    'preparation', 'dosage', 'properties', 'benefits', 'uses', 'effects',
    'ashwagandha', 'brahmi', 'turmeric', 'neem', 'tulsi', 'triphala'
  ];

  private static diagnosticKeywords = [
    'diagnose', 'symptom', 'sign', 'indication', 'examination', 'assess',
    'identify', 'recognize', 'detect', 'determine', 'evaluate'
  ];

  private static pharmacopoeiaKeywords = [
    'test', 'analysis', 'microscope', 'preparation', 'extract', 'compound',
    'quality', 'standard', 'purity', 'identification', 'authentication'
  ];

  private static skinKeywords = [
    'skin', 'rash', 'eczema', 'psoriasis', 'dermatitis', 'kushta', 'acne',
    'itching', 'redness', 'eruption', 'lesion', 'pigmentation'
  ];

  private static mentalKeywords = [
    'mental', 'mind', 'anxiety', 'depression', 'stress', 'insomnia', 'memory',
    'concentration', 'mood', 'emotional', 'psychological', 'manasika'
  ];

  /**
   * Classify query intent
   */
  static classifyIntent(query: string): QueryIntent[] {
    const lowerQuery = query.toLowerCase();
    const intents: Set<QueryIntent> = new Set();

    // Check for clinical treatment intent
    if (this.clinicalKeywords.some(kw => lowerQuery.includes(kw))) {
      intents.add('clinical_treatment');
    }

    // Check for herb information intent
    if (this.herbKeywords.some(kw => lowerQuery.includes(kw))) {
      intents.add('herb_properties');
    }

    // Check for diagnostic intent
    if (this.diagnosticKeywords.some(kw => lowerQuery.includes(kw))) {
      intents.add('diagnostic');
    }

    // Check for pharmacopoeia intent
    if (this.pharmacopoeiaKeywords.some(kw => lowerQuery.includes(kw))) {
      intents.add('pharmacopoeia');
    }

    // Default to general if no specific intent detected
    if (intents.size === 0) {
      intents.add('general');
    }

    return Array.from(intents);
  }

  /**
   * Classify domain for dataset routing
   */
  static classifyDomain(query: string): DomainType[] {
    const lowerQuery = query.toLowerCase();
    const domains: Set<DomainType> = new Set();

    // Check for skin disease domain
    if (this.skinKeywords.some(kw => lowerQuery.includes(kw))) {
      domains.add('skin_diseases');
    }

    // Check for mental health domain
    if (this.mentalKeywords.some(kw => lowerQuery.includes(kw))) {
      domains.add('mental_disorders');
    }

    // Check for pharmacopoeia domain
    if (this.pharmacopoeiaKeywords.some(kw => lowerQuery.includes(kw))) {
      domains.add('pharmacopoeia');
    }

    // Add general domain as fallback
    if (domains.size === 0 || domains.size > 1) {
      domains.add('general');
    }

    return Array.from(domains);
  }

  /**
   * Get recommended datasets based on query
   */
  static getRecommendedDatasets(query: string): string[] {
    const domains = this.classifyDomain(query);
    const datasets: Set<string> = new Set();

    for (const domain of domains) {
      switch (domain) {
        case 'skin_diseases':
          datasets.add('ayu_skinDiseases_rag.json');
          break;
        case 'mental_disorders':
          datasets.add('ayu_mentalDisorders_rag.json');
          break;
        case 'pharmacopoeia':
          datasets.add('ayurcheck_rag.json');
          break;
        case 'general':
          // Include all datasets for general queries
          datasets.add('ayurcheck_rag.json');
          datasets.add('ayu_skinDiseases_rag.json');
          datasets.add('ayu_mentalDisorders_rag.json');
          break;
      }
    }

    return Array.from(datasets);
  }
}

/**
 * Query Expansion
 * Expands queries with synonyms and related terms for better recall
 */
export class QueryExpander {
  private static ayurvedicSynonyms: Record<string, string[]> = {
    'skin': ['kushta', 'carma', 'tvak', 'skin disease'],
    'rash': ['eruption', 'visphota', 'pidaka', 'skin eruption'],
    'anxiety': ['chinta', 'mental stress', 'manasika', 'unrest'],
    'digestion': ['agni', 'pachana', 'digestive fire', 'metabolism'],
    'inflammation': ['shotha', 'swelling', 'inflammatory'],
    'pain': ['vedana', 'shula', 'ruja', 'ache'],
    'cold': ['pratishyaya', 'common cold', 'nasal congestion'],
    'fever': ['jwara', 'high temperature', 'pyrexia'],
  };

  /**
   * Expand query with synonyms and related terms
   */
  static expandQuery(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const expansions: Set<string> = new Set([query]);

    // Add synonyms for matched terms
    for (const [term, synonyms] of Object.entries(this.ayurvedicSynonyms)) {
      if (lowerQuery.includes(term)) {
        for (const synonym of synonyms) {
          const expandedQuery = lowerQuery.replace(term, synonym);
          expansions.add(expandedQuery);
        }
      }
    }

    return Array.from(expansions);
  }

  /**
   * Extract key medical terms from query
   */
  static extractKeyTerms(query: string): string[] {
    const terms: string[] = [];
    const lowerQuery = query.toLowerCase();
    const seenTerms = new Set<string>();

    // Extract medical condition terms
    const medicalTerms = [
      ...QueryClassifier['clinicalKeywords'],
      ...QueryClassifier['herbKeywords'],
      ...QueryClassifier['skinKeywords'],
      ...QueryClassifier['mentalKeywords']
    ];

    for (const term of medicalTerms) {
      if (lowerQuery.includes(term) && !seenTerms.has(term)) {
        terms.push(term);
        seenTerms.add(term);
      }
    }

    return terms;
  }
}

/**
 * Hybrid Search
 * Combines semantic similarity with keyword matching
 */
export class HybridSearch {
  /**
   * Calculate BM25-style keyword score
   */
  static calculateKeywordScore(query: string, document: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const docTerms = document.toLowerCase().split(/\s+/);
    const docLength = docTerms.length;
    
    let score = 0;
    const termFrequency: Map<string, number> = new Map();

    // Calculate term frequency
    for (const term of docTerms) {
      termFrequency.set(term, (termFrequency.get(term) || 0) + 1);
    }

    // BM25-inspired scoring (simplified)
    const k1 = 1.5; // Term frequency saturation parameter
    const avgDocLength = 500; // Average document length
    
    for (const queryTerm of queryTerms) {
      const tf = termFrequency.get(queryTerm) || 0;
      if (tf > 0) {
        const normalizedTF = (tf * (k1 + 1)) / (tf + k1 * (1 - 0.75 + 0.75 * (docLength / avgDocLength)));
        score += normalizedTF;
      }
    }

    return score;
  }

  /**
   * Combine semantic and keyword scores
   */
  static combineScores(
    semanticScore: number,
    keywordScore: number,
    alpha: number = 0.7
  ): number {
    // Alpha controls the weight: 1.0 = pure semantic, 0.0 = pure keyword
    return alpha * semanticScore + (1 - alpha) * keywordScore;
  }

  /**
   * Re-rank documents using hybrid approach
   */
  static rerank<T extends { pageContent: string }>(
    query: string,
    documents: [T, number][],
    alpha: number = 0.7
  ): [T, number][] {
    const rerankedDocs: [T, number][] = documents.map(([doc, semanticScore]) => {
      const keywordScore = this.calculateKeywordScore(query, doc.pageContent);
      // Normalize keyword score to 0-1 range
      const normalizedKeywordScore = Math.min(keywordScore / 10, 1.0);
      const hybridScore = this.combineScores(semanticScore, normalizedKeywordScore, alpha);
      return [doc, hybridScore];
    });

    // Sort by hybrid score
    return rerankedDocs.sort((a, b) => b[1] - a[1]);
  }
}

/**
 * Relevance Filter
 * Filters out irrelevant results and prevents hallucination
 */
export class RelevanceFilter {
  private static readonly MIN_SEMANTIC_SCORE = 0.5; // Minimum cosine similarity
  private static readonly MIN_KEYWORD_OVERLAP = 0.1; // Minimum keyword overlap ratio

  /**
   * Check if document is relevant to query
   */
  static isRelevant(
    query: string,
    document: string,
    semanticScore: number
  ): boolean {
    // Check semantic score threshold
    if (semanticScore < this.MIN_SEMANTIC_SCORE) {
      return false;
    }

    // Check keyword overlap
    const queryTermsArray = query.toLowerCase().split(/\s+/);
    const docTerms = new Set(document.toLowerCase().split(/\s+/));
    
    let overlapCount = 0;
    for (const term of queryTermsArray) {
      if (term.length > 3 && docTerms.has(term)) {
        overlapCount++;
      }
    }

    const overlapRatio = overlapCount / Math.max(queryTermsArray.length, 1);
    return overlapRatio >= this.MIN_KEYWORD_OVERLAP;
  }

  /**
   * Filter documents by relevance
   */
  static filterDocuments<T extends { pageContent: string }>(
    query: string,
    documents: [T, number][],
    minScore: number = this.MIN_SEMANTIC_SCORE
  ): [T, number][] {
    return documents.filter(([doc, score]) => {
      return score >= minScore && this.isRelevant(query, doc.pageContent, score);
    });
  }
}

/**
 * Context Optimizer
 * Optimizes context for LLM by compressing and ranking
 */
export class ContextOptimizer {
  /**
   * Format documents as context with metadata
   */
  static formatContext<T extends { pageContent: string; metadata?: any }>(
    documents: [T, number][],
    maxLength: number = 4000
  ): string {
    let context = '';
    let currentLength = 0;

    for (let i = 0; i < documents.length; i++) {
      const [doc, score] = documents[i];
      const metadata = doc.metadata || {};
      
      // Format with metadata
      let chunk = `\n--- Document ${i + 1} (Relevance: ${(score * 100).toFixed(1)}%) ---\n`;
      
      if (metadata.source_document) {
        chunk += `Source: ${metadata.source_document}\n`;
      }
      if (metadata.page_number) {
        chunk += `Page: ${metadata.page_number}\n`;
      }
      if (metadata.herb_name) {
        chunk += `Herb: ${metadata.herb_name}\n`;
      }
      if (metadata.category) {
        chunk += `Category: ${metadata.category}\n`;
      }
      
      chunk += `\n${doc.pageContent}\n`;

      // Check if adding this chunk would exceed max length
      if (currentLength + chunk.length > maxLength && context.length > 0) {
        break;
      }

      context += chunk;
      currentLength += chunk.length;
    }

    return context;
  }

  /**
   * Compress context by removing redundant information
   */
  static compressContext(context: string, maxLength: number = 4000): string {
    if (context.length <= maxLength) {
      return context;
    }

    // Simple compression: keep most relevant sentences
    const sentences = context.split(/[.!?]\s+/);
    let compressed = '';
    
    for (const sentence of sentences) {
      if (compressed.length + sentence.length + 2 <= maxLength) {
        compressed += sentence + '. ';
      } else {
        break;
      }
    }

    return compressed.trim();
  }
}

/**
 * Citation Verifier
 * Validates citations against source documents
 */
export class CitationVerifier {
  /**
   * Extract citations from text
   */
  static extractCitations(text: string): string[] {
    const citationPattern = /【[^】]+】/g;
    return text.match(citationPattern) || [];
  }

  /**
   * Verify citation exists in source documents
   */
  static verifyCitation(
    citation: string,
    sourceDocuments: Document[]
  ): { valid: boolean; confidence: number; reason?: string } {
    // Extract citation components
    const match = citation.match(/【([^†]+)(?:†([^†]+))?(?:†Page (\d+))?】/);
    if (!match) {
      return { valid: false, confidence: 0, reason: 'Invalid citation format' };
    }

    const [, source, herbName, pageNum] = match;
    
    // Check if citation matches any source document
    for (const doc of sourceDocuments) {
      const metadata = doc.metadata || {};
      
      // Check page number match
      if (pageNum && metadata.page_number && metadata.page_number === parseInt(pageNum)) {
        return { valid: true, confidence: 0.9 };
      }

      // Check herb name match
      if (herbName && metadata.herb_name && 
          metadata.herb_name.toLowerCase().includes(herbName.toLowerCase())) {
        return { valid: true, confidence: 0.8 };
      }

      // Check content match
      if (doc.pageContent.toLowerCase().includes(herbName?.toLowerCase() || '')) {
        return { valid: true, confidence: 0.6 };
      }
    }

    return { 
      valid: false, 
      confidence: 0, 
      reason: 'Citation not found in source documents' 
    };
  }
}

/**
 * Response Quality Validator
 * Validates response quality and grounding
 */
export class ResponseValidator {
  /**
   * Calculate grounding score (how much of response is from context)
   */
  static calculateGroundingScore(response: string, context: string): number {
    const responseTermsArray = response.toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 4);
    
    const responseTerms = new Set(responseTermsArray);
    
    const contextTerms = new Set(
      context.toLowerCase()
        .split(/\s+/)
        .filter(term => term.length > 4)
    );

    let groundedTerms = 0;
    responseTermsArray.forEach(term => {
      if (responseTerms.has(term) && contextTerms.has(term)) {
        groundedTerms++;
        responseTerms.delete(term); // Count each unique term once
      }
    });

    return responseTermsArray.length > 0 ? groundedTerms / responseTermsArray.length : 0;
  }

  /**
   * Validate response quality
   */
  static validate(
    response: string,
    context: string,
    sourceDocuments: Document[]
  ): {
    isValid: boolean;
    groundingScore: number;
    citationAccuracy: number;
    warnings: string[];
  } {
    const warnings: string[] = [];
    
    // Calculate grounding score
    const groundingScore = this.calculateGroundingScore(response, context);
    if (groundingScore < 0.3) {
      warnings.push('Low grounding: Response may contain hallucinated content');
    }

    // Validate citations
    const citations = CitationVerifier.extractCitations(response);
    let validCitations = 0;
    
    for (const citation of citations) {
      const verification = CitationVerifier.verifyCitation(citation, sourceDocuments);
      if (verification.valid && verification.confidence > 0.5) {
        validCitations++;
      } else {
        warnings.push(`Invalid citation: ${citation}`);
      }
    }

    const citationAccuracy = citations.length > 0 ? validCitations / citations.length : 1.0;

    return {
      isValid: groundingScore >= 0.3 && citationAccuracy >= 0.5,
      groundingScore,
      citationAccuracy,
      warnings
    };
  }
}
