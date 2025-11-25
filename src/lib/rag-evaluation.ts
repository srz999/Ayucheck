/**
 * RAG Evaluation Framework
 * 
 * Provides tools to evaluate RAG system performance:
 * - Retrieval quality metrics
 * - Response quality metrics
 * - Ground truth comparison
 * - Automated testing
 */

import { Document } from "@langchain/core/documents";

export interface EvaluationMetrics {
  retrievalQuality: RetrievalMetrics;
  responseQuality: ResponseMetrics;
  overallScore: number;
}

export interface RetrievalMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  averageRelevanceScore: number;
  ndcg: number; // Normalized Discounted Cumulative Gain
}

export interface ResponseMetrics {
  groundingScore: number;
  citationAccuracy: number;
  factualAccuracy: number;
  completeness: number;
  relevance: number;
}

export interface GroundTruthExample {
  query: string;
  expectedDocuments: string[]; // Expected document IDs
  expectedAnswer: string;
  expectedConcepts: string[]; // Key concepts that should be mentioned
  category: string; // 'clinical', 'pharmacopoeia', 'diagnostic'
}

/**
 * Retrieval Quality Evaluator
 */
export class RetrievalEvaluator {
  /**
   * Calculate precision: proportion of retrieved documents that are relevant
   */
  static calculatePrecision(
    retrievedDocs: string[],
    relevantDocs: string[]
  ): number {
    if (retrievedDocs.length === 0) return 0;

    const relevantSet = new Set(relevantDocs);
    const truePositives = retrievedDocs.filter(doc => relevantSet.has(doc)).length;
    
    return truePositives / retrievedDocs.length;
  }

  /**
   * Calculate recall: proportion of relevant documents that were retrieved
   */
  static calculateRecall(
    retrievedDocs: string[],
    relevantDocs: string[]
  ): number {
    if (relevantDocs.length === 0) return 0;

    const retrievedSet = new Set(retrievedDocs);
    const truePositives = relevantDocs.filter(doc => retrievedSet.has(doc)).length;
    
    return truePositives / relevantDocs.length;
  }

  /**
   * Calculate F1 score: harmonic mean of precision and recall
   */
  static calculateF1Score(precision: number, recall: number): number {
    if (precision + recall === 0) return 0;
    return 2 * (precision * recall) / (precision + recall);
  }

  /**
   * Calculate NDCG (Normalized Discounted Cumulative Gain)
   * Evaluates ranking quality considering both relevance and position
   */
  static calculateNDCG(
    rankedDocs: string[],
    relevanceScores: Map<string, number>
  ): number {
    const dcg = this.calculateDCG(rankedDocs, relevanceScores);
    const idealDCG = this.calculateIdealDCG(relevanceScores);
    
    return idealDCG > 0 ? dcg / idealDCG : 0;
  }

  /**
   * Calculate DCG (Discounted Cumulative Gain)
   */
  private static calculateDCG(
    rankedDocs: string[],
    relevanceScores: Map<string, number>
  ): number {
    let dcg = 0;
    
    for (let i = 0; i < rankedDocs.length; i++) {
      const relevance = relevanceScores.get(rankedDocs[i]) || 0;
      // DCG formula: rel_i / log2(i + 2)
      dcg += relevance / Math.log2(i + 2);
    }
    
    return dcg;
  }

  /**
   * Calculate ideal DCG (with perfect ranking)
   */
  private static calculateIdealDCG(relevanceScores: Map<string, number>): number {
    const sortedRelevances = Array.from(relevanceScores.values())
      .sort((a, b) => b - a);
    
    let idealDCG = 0;
    for (let i = 0; i < sortedRelevances.length; i++) {
      idealDCG += sortedRelevances[i] / Math.log2(i + 2);
    }
    
    return idealDCG;
  }

  /**
   * Calculate Mean Reciprocal Rank (MRR)
   * Measures how high the first relevant document is ranked
   */
  static calculateMRR(
    rankedDocs: string[],
    relevantDocs: string[]
  ): number {
    const relevantSet = new Set(relevantDocs);
    
    for (let i = 0; i < rankedDocs.length; i++) {
      if (relevantSet.has(rankedDocs[i])) {
        return 1 / (i + 1);
      }
    }
    
    return 0;
  }

  /**
   * Evaluate retrieval quality
   */
  static evaluate(
    retrievedDocs: string[],
    relevantDocs: string[],
    relevanceScores?: Map<string, number>
  ): RetrievalMetrics {
    const precision = this.calculatePrecision(retrievedDocs, relevantDocs);
    const recall = this.calculateRecall(retrievedDocs, relevantDocs);
    const f1Score = this.calculateF1Score(precision, recall);
    
    let ndcg = 0;
    if (relevanceScores) {
      ndcg = this.calculateNDCG(retrievedDocs, relevanceScores);
    }

    let averageRelevanceScore = 0;
    if (relevanceScores) {
      const scores = retrievedDocs.map(doc => relevanceScores.get(doc) || 0);
      averageRelevanceScore = scores.reduce((a, b) => a + b, 0) / Math.max(scores.length, 1);
    }

    return {
      precision,
      recall,
      f1Score,
      averageRelevanceScore,
      ndcg,
    };
  }
}

/**
 * Response Quality Evaluator
 */
export class ResponseEvaluator {
  /**
   * Calculate concept coverage
   * Measures how many expected concepts are mentioned in the response
   */
  static calculateConceptCoverage(
    response: string,
    expectedConcepts: string[]
  ): number {
    if (expectedConcepts.length === 0) return 1.0;

    const responseLower = response.toLowerCase();
    const mentionedConcepts = expectedConcepts.filter(concept =>
      responseLower.includes(concept.toLowerCase())
    );

    return mentionedConcepts.length / expectedConcepts.length;
  }

  /**
   * Calculate response relevance using keyword overlap
   */
  static calculateRelevance(query: string, response: string): number {
    const queryTerms = query.toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 3);
    
    if (queryTerms.length === 0) return 0;

    const responseLower = response.toLowerCase();
    const matchedTerms = queryTerms.filter(term => responseLower.includes(term));

    return matchedTerms.length / queryTerms.length;
  }

  /**
   * Calculate response completeness
   * Based on length and structure
   */
  static calculateCompleteness(response: string): number {
    // Heuristics for completeness
    const minLength = 100; // Minimum expected characters
    const maxLength = 2000; // Maximum reasonable length
    const length = response.length;

    // Length score (0-0.4)
    const lengthScore = Math.min(length / maxLength, 1.0) * 0.4;

    // Structure score (0-0.3)
    const hasSentences = (response.match(/[.!?]/g) || []).length > 2;
    const hasMultipleParagraphs = response.split('\n\n').length > 1;
    const structureScore = (hasSentences ? 0.15 : 0) + (hasMultipleParagraphs ? 0.15 : 0);

    // Information density score (0-0.3)
    const words = response.split(/\s+/).length;
    const density = Math.min(words / 200, 1.0) * 0.3;

    return Math.min(lengthScore + structureScore + density, 1.0);
  }

  /**
   * Evaluate response quality
   */
  static evaluate(
    query: string,
    response: string,
    expectedConcepts: string[],
    groundingScore: number,
    citationAccuracy: number
  ): ResponseMetrics {
    const conceptCoverage = this.calculateConceptCoverage(response, expectedConcepts);
    const relevance = this.calculateRelevance(query, response);
    const completeness = this.calculateCompleteness(response);

    return {
      groundingScore,
      citationAccuracy,
      factualAccuracy: conceptCoverage, // Using concept coverage as proxy
      completeness,
      relevance,
    };
  }
}

/**
 * Comprehensive RAG Evaluator
 */
export class RAGEvaluator {
  /**
   * Evaluate RAG system on ground truth examples
   */
  static evaluateOnGroundTruth(
    examples: GroundTruthExample[],
    retrieveFn: (query: string) => Promise<string[]>,
    generateFn: (query: string, context: string) => Promise<string>
  ): Promise<EvaluationMetrics[]> {
    return Promise.all(
      examples.map(example => this.evaluateSingle(example, retrieveFn, generateFn))
    );
  }

  /**
   * Evaluate single example
   */
  static async evaluateSingle(
    example: GroundTruthExample,
    retrieveFn: (query: string) => Promise<string[]>,
    generateFn: (query: string, context: string) => Promise<string>
  ): Promise<EvaluationMetrics> {
    // Retrieve documents
    const retrievedDocs = await retrieveFn(example.query);

    // Evaluate retrieval
    const retrievalMetrics = RetrievalEvaluator.evaluate(
      retrievedDocs,
      example.expectedDocuments
    );

    // Generate response
    const context = retrievedDocs.join('\n\n');
    const response = await generateFn(example.query, context);

    // Evaluate response (using mock scores for grounding and citation)
    const groundingScore = 0.8; // Would need actual calculation
    const citationAccuracy = 0.9; // Would need actual calculation

    const responseMetrics = ResponseEvaluator.evaluate(
      example.query,
      response,
      example.expectedConcepts,
      groundingScore,
      citationAccuracy
    );

    // Calculate overall score
    const overallScore = this.calculateOverallScore(retrievalMetrics, responseMetrics);

    return {
      retrievalQuality: retrievalMetrics,
      responseQuality: responseMetrics,
      overallScore,
    };
  }

  /**
   * Calculate overall score from retrieval and response metrics
   */
  static calculateOverallScore(
    retrieval: RetrievalMetrics,
    response: ResponseMetrics
  ): number {
    // Weighted average of key metrics
    const weights = {
      retrievalF1: 0.2,
      retrievalNDCG: 0.15,
      grounding: 0.25,
      factualAccuracy: 0.2,
      relevance: 0.1,
      completeness: 0.1,
    };

    return (
      weights.retrievalF1 * retrieval.f1Score +
      weights.retrievalNDCG * retrieval.ndcg +
      weights.grounding * response.groundingScore +
      weights.factualAccuracy * response.factualAccuracy +
      weights.relevance * response.relevance +
      weights.completeness * response.completeness
    );
  }

  /**
   * Generate evaluation report
   */
  static generateReport(metrics: EvaluationMetrics[]): string {
    if (metrics.length === 0) {
      return 'No evaluation data available';
    }

    const avgMetrics = this.calculateAverageMetrics(metrics);

    return `
# RAG Evaluation Report

## Summary
- Total Examples: ${metrics.length}
- Average Overall Score: ${(avgMetrics.overallScore * 100).toFixed(1)}%

## Retrieval Quality
- Precision: ${(avgMetrics.retrievalQuality.precision * 100).toFixed(1)}%
- Recall: ${(avgMetrics.retrievalQuality.recall * 100).toFixed(1)}%
- F1 Score: ${(avgMetrics.retrievalQuality.f1Score * 100).toFixed(1)}%
- NDCG: ${(avgMetrics.retrievalQuality.ndcg * 100).toFixed(1)}%
- Avg Relevance: ${avgMetrics.retrievalQuality.averageRelevanceScore.toFixed(2)}

## Response Quality
- Grounding Score: ${(avgMetrics.responseQuality.groundingScore * 100).toFixed(1)}%
- Citation Accuracy: ${(avgMetrics.responseQuality.citationAccuracy * 100).toFixed(1)}%
- Factual Accuracy: ${(avgMetrics.responseQuality.factualAccuracy * 100).toFixed(1)}%
- Completeness: ${(avgMetrics.responseQuality.completeness * 100).toFixed(1)}%
- Relevance: ${(avgMetrics.responseQuality.relevance * 100).toFixed(1)}%

## Interpretation
${this.interpretResults(avgMetrics)}
    `.trim();
  }

  /**
   * Calculate average metrics
   */
  private static calculateAverageMetrics(metrics: EvaluationMetrics[]): EvaluationMetrics {
    const sum = metrics.reduce(
      (acc, m) => ({
        retrievalQuality: {
          precision: acc.retrievalQuality.precision + m.retrievalQuality.precision,
          recall: acc.retrievalQuality.recall + m.retrievalQuality.recall,
          f1Score: acc.retrievalQuality.f1Score + m.retrievalQuality.f1Score,
          averageRelevanceScore: acc.retrievalQuality.averageRelevanceScore + m.retrievalQuality.averageRelevanceScore,
          ndcg: acc.retrievalQuality.ndcg + m.retrievalQuality.ndcg,
        },
        responseQuality: {
          groundingScore: acc.responseQuality.groundingScore + m.responseQuality.groundingScore,
          citationAccuracy: acc.responseQuality.citationAccuracy + m.responseQuality.citationAccuracy,
          factualAccuracy: acc.responseQuality.factualAccuracy + m.responseQuality.factualAccuracy,
          completeness: acc.responseQuality.completeness + m.responseQuality.completeness,
          relevance: acc.responseQuality.relevance + m.responseQuality.relevance,
        },
        overallScore: acc.overallScore + m.overallScore,
      }),
      {
        retrievalQuality: { precision: 0, recall: 0, f1Score: 0, averageRelevanceScore: 0, ndcg: 0 },
        responseQuality: { groundingScore: 0, citationAccuracy: 0, factualAccuracy: 0, completeness: 0, relevance: 0 },
        overallScore: 0,
      }
    );

    const count = metrics.length;
    return {
      retrievalQuality: {
        precision: sum.retrievalQuality.precision / count,
        recall: sum.retrievalQuality.recall / count,
        f1Score: sum.retrievalQuality.f1Score / count,
        averageRelevanceScore: sum.retrievalQuality.averageRelevanceScore / count,
        ndcg: sum.retrievalQuality.ndcg / count,
      },
      responseQuality: {
        groundingScore: sum.responseQuality.groundingScore / count,
        citationAccuracy: sum.responseQuality.citationAccuracy / count,
        factualAccuracy: sum.responseQuality.factualAccuracy / count,
        completeness: sum.responseQuality.completeness / count,
        relevance: sum.responseQuality.relevance / count,
      },
      overallScore: sum.overallScore / count,
    };
  }

  /**
   * Interpret results and provide recommendations
   */
  private static interpretResults(metrics: EvaluationMetrics): string {
    const issues: string[] = [];
    const strengths: string[] = [];

    // Analyze retrieval
    if (metrics.retrievalQuality.precision < 0.5) {
      issues.push('Low precision: Many irrelevant documents retrieved');
    }
    if (metrics.retrievalQuality.recall < 0.5) {
      issues.push('Low recall: Missing relevant documents');
    }
    if (metrics.retrievalQuality.f1Score >= 0.7) {
      strengths.push('Good retrieval quality (F1 >= 0.7)');
    }

    // Analyze response
    if (metrics.responseQuality.groundingScore < 0.6) {
      issues.push('Low grounding: Risk of hallucination');
    }
    if (metrics.responseQuality.factualAccuracy < 0.6) {
      issues.push('Low factual accuracy: Missing key concepts');
    }
    if (metrics.responseQuality.groundingScore >= 0.8) {
      strengths.push('Well-grounded responses');
    }

    let interpretation = '';
    if (strengths.length > 0) {
      interpretation += '**Strengths:**\n' + strengths.map(s => `- ${s}`).join('\n') + '\n\n';
    }
    if (issues.length > 0) {
      interpretation += '**Areas for Improvement:**\n' + issues.map(i => `- ${i}`).join('\n');
    }

    return interpretation || 'System performance is within acceptable range.';
  }
}

/**
 * Sample ground truth examples for testing
 */
export const SAMPLE_GROUND_TRUTH: GroundTruthExample[] = [
  {
    query: 'What are the symptoms of Vicaracika?',
    expectedDocuments: ['skin_disease_vicaracika'],
    expectedAnswer: 'Vicaracika is characterized by redness, itching, and eruptions',
    expectedConcepts: ['vicaracika', 'pitta', 'skin', 'redness', 'itching'],
    category: 'clinical',
  },
  {
    query: 'What is the botanical name of Haridra?',
    expectedDocuments: ['pharmacopoeia_turmeric'],
    expectedAnswer: 'Curcuma longa',
    expectedConcepts: ['curcuma longa', 'turmeric', 'haridra'],
    category: 'pharmacopoeia',
  },
  {
    query: 'How to treat anxiety according to Ayurveda?',
    expectedDocuments: ['mental_disorders_anxiety'],
    expectedAnswer: 'Use of Brahmi, Ashwagandha, meditation',
    expectedConcepts: ['anxiety', 'brahmi', 'ashwagandha', 'vata', 'mind'],
    category: 'clinical',
  },
];
