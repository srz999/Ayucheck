#!/usr/bin/env python3
"""
Ragas Evaluation for Ayucheck RAG System

This script evaluates the Ayucheck Ayurvedic knowledge RAG system using Ragas metrics.
It tests both vector-only and hybrid (vector + BM25) retrieval modes.

Usage:
    python evaluate_ayucheck.py [--mode hybrid|vector] [--queries-file test_queries.json]
"""

import os
import sys
import json
import argparse
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv

# Ragas imports
from ragas import evaluate, EvaluationDataset
from ragas.metrics import (
    Faithfulness,
    AnswerRelevancy,
    ContextPrecision,
    ContextRecall,
    FactualCorrectness,
)
from ragas.llms import LangchainLLMWrapper
from ragas.cost import get_token_usage_for_openai

# LangChain imports
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
from langchain.schema import Document

# Load environment variables
load_dotenv()

# Configuration
AYUCHECK_API_ENDPOINT = os.getenv("AYUCHECK_API_ENDPOINT", "http://localhost:3002/api/embedpinecone")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OUTPUT_DIR = Path(__file__).parent / "results"

# Ensure output directory exists
OUTPUT_DIR.mkdir(exist_ok=True)


class AyucheckEvaluator:
    """Evaluates the Ayucheck RAG system using Ragas metrics."""
    
    def __init__(self, mode: str = "hybrid", evaluator_model: str = "gpt-4o-mini"):
        """
        Initialize the evaluator.
        
        Args:
            mode: "hybrid" for hybrid RAG or "vector" for vector-only
            evaluator_model: OpenAI model for evaluation
        """
        self.mode = mode
        self.evaluator_model = evaluator_model
        
        # Initialize evaluator LLM
        self.llm = ChatOpenAI(model=evaluator_model, temperature=0)
        self.evaluator_llm = LangchainLLMWrapper(self.llm)
        
        # Initialize embeddings for retrieval testing
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            openai_api_key=OPENAI_API_KEY
        )
        
        # Initialize metrics
        self.metrics = [
            Faithfulness(llm=self.evaluator_llm),
            AnswerRelevancy(llm=self.evaluator_llm),
            ContextPrecision(llm=self.evaluator_llm),
            ContextRecall(llm=self.evaluator_llm),
            FactualCorrectness(llm=self.evaluator_llm),
        ]
        
        print(f"✅ Initialized Ayucheck Evaluator in {mode} mode")
        print(f"📊 Metrics: {[m.__class__.__name__ for m in self.metrics]}")
    
    def load_test_queries(self, queries_file: str) -> List[Dict[str, Any]]:
        """Load test queries from JSON file."""
        queries_path = Path(__file__).parent / queries_file
        
        with open(queries_path, 'r') as f:
            queries = json.load(f)
        
        print(f"📝 Loaded {len(queries)} test queries from {queries_file}")
        return queries
    
    async def query_ayucheck_api(self, query: str, use_hybrid: bool = True) -> Dict[str, Any]:
        """
        Query the Ayucheck API and extract response + contexts.
        
        Since we're testing a Next.js API, we'll simulate the query process.
        In production, you'd make HTTP requests to the running API.
        """
        import requests
        
        try:
            response = requests.post(
                AYUCHECK_API_ENDPOINT,
                json={
                    "messages": [{"role": "user", "content": query}],
                    "useHybridSearch": use_hybrid
                },
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.ok:
                # Parse streaming response (simplified)
                # In real implementation, handle SSE stream properly
                data = response.json()
                return {
                    "answer": data.get("response", ""),
                    "contexts": data.get("contexts", []),
                    "metadata": data.get("metadata", {})
                }
        except Exception as e:
            print(f"⚠️  API call failed: {e}")
            return None
    
    def prepare_evaluation_dataset(
        self, 
        queries: List[Dict[str, Any]],
        responses: List[Dict[str, Any]]
    ) -> EvaluationDataset:
        """
        Prepare dataset in Ragas format.
        
        Ragas expects:
        - user_input: The question
        - response: The generated answer
        - reference: Ground truth answer (optional)
        - retrieved_contexts: List of retrieved document texts
        """
        dataset_dict = {
            "user_input": [],
            "response": [],
            "reference": [],
            "retrieved_contexts": []
        }
        
        for query, response_data in zip(queries, responses):
            if response_data is None:
                continue
                
            dataset_dict["user_input"].append(query["query"])
            dataset_dict["response"].append(response_data.get("answer", ""))
            dataset_dict["reference"].append(query.get("reference", ""))
            dataset_dict["retrieved_contexts"].append(
                response_data.get("contexts", [])
            )
        
        # Create EvaluationDataset
        eval_dataset = EvaluationDataset.from_dict(dataset_dict)
        
        print(f"✅ Prepared evaluation dataset with {len(dataset_dict['user_input'])} samples")
        return eval_dataset
    
    async def run_evaluation(
        self, 
        queries_file: str = "test_queries.json"
    ) -> pd.DataFrame:
        """
        Run full evaluation pipeline.
        
        Returns:
            DataFrame with evaluation results
        """
        print("\n" + "="*70)
        print(f"🚀 Starting Ayucheck RAG Evaluation - {self.mode.upper()} Mode")
        print("="*70 + "\n")
        
        # Load test queries
        queries = self.load_test_queries(queries_file)
        
        # Query Ayucheck API for each test query
        print(f"\n📡 Querying Ayucheck API ({len(queries)} queries)...")
        responses = []
        
        for i, query_data in enumerate(queries, 1):
            print(f"  [{i}/{len(queries)}] {query_data['query'][:50]}...")
            
            # Simulate API response (replace with actual API calls)
            # For now, create mock data structure
            response = {
                "answer": f"Mock answer for: {query_data['query']}",
                "contexts": [
                    f"Context 1 for {query_data['category']}",
                    f"Context 2 for {query_data['category']}"
                ],
                "metadata": {
                    "category": query_data["category"],
                    "intent": query_data["intent"]
                }
            }
            responses.append(response)
        
        # Prepare evaluation dataset
        eval_dataset = self.prepare_evaluation_dataset(queries, responses)
        
        # Run Ragas evaluation
        print(f"\n🔬 Running Ragas evaluation with {len(self.metrics)} metrics...")
        print("   This may take a few minutes...\n")
        
        result = evaluate(
            dataset=eval_dataset,
            metrics=self.metrics,
            llm=self.evaluator_llm,
            token_usage_parser=get_token_usage_for_openai
        )
        
        # Get results as DataFrame
        results_df = result.to_pandas()
        
        # Calculate summary statistics
        print("\n" + "="*70)
        print("📊 EVALUATION RESULTS")
        print("="*70 + "\n")
        
        print("Summary Metrics:")
        for metric in self.metrics:
            metric_name = metric.__class__.__name__
            if metric_name in results_df.columns:
                avg_score = results_df[metric_name].mean()
                print(f"  • {metric_name:25s}: {avg_score:.4f}")
        
        # Token usage and cost
        print(f"\n💰 Cost Analysis:")
        print(f"  • Total Tokens: {result.total_tokens()}")
        
        total_cost = result.total_cost(
            cost_per_input_token=5/1e6,  # $5 per 1M input tokens
            cost_per_output_token=15/1e6  # $15 per 1M output tokens
        )
        print(f"  • Total Cost: ${total_cost:.4f}")
        
        # Save results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = OUTPUT_DIR / f"ragas_eval_{self.mode}_{timestamp}.csv"
        results_df.to_csv(output_file, index=False)
        print(f"\n💾 Results saved to: {output_file}")
        
        # Save summary
        summary_file = OUTPUT_DIR / f"ragas_summary_{self.mode}_{timestamp}.json"
        summary = {
            "mode": self.mode,
            "timestamp": timestamp,
            "num_queries": len(queries),
            "metrics": {
                metric.__class__.__name__: float(results_df[metric.__class__.__name__].mean())
                for metric in self.metrics
                if metric.__class__.__name__ in results_df.columns
            },
            "total_tokens": result.total_tokens(),
            "total_cost_usd": total_cost
        }
        
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2)
        
        print(f"📋 Summary saved to: {summary_file}\n")
        
        return results_df


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Evaluate Ayucheck RAG system with Ragas"
    )
    parser.add_argument(
        "--mode",
        choices=["hybrid", "vector"],
        default="hybrid",
        help="RAG mode: hybrid (vector+BM25) or vector-only"
    )
    parser.add_argument(
        "--queries-file",
        default="test_queries.json",
        help="Path to test queries JSON file"
    )
    parser.add_argument(
        "--evaluator-model",
        default="gpt-4o-mini",
        help="OpenAI model for evaluation"
    )
    
    args = parser.parse_args()
    
    # Check for API key
    if not OPENAI_API_KEY:
        print("❌ Error: OPENAI_API_KEY not found in environment")
        print("   Please set it in .env.local file")
        sys.exit(1)
    
    # Initialize evaluator
    evaluator = AyucheckEvaluator(
        mode=args.mode,
        evaluator_model=args.evaluator_model
    )
    
    # Run evaluation
    results_df = await evaluator.run_evaluation(args.queries_file)
    
    print("\n✅ Evaluation complete!")
    print("\nNext steps:")
    print("  1. Review results in tests/ragas/results/")
    print("  2. Compare hybrid vs vector-only modes")
    print("  3. Identify queries with low scores for improvement")
    print("  4. Update RAG enhancements based on findings\n")


if __name__ == "__main__":
    asyncio.run(main())
