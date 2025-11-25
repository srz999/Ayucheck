# I. Introduction

## Problem Statement & Motivation
**Research Question:** How can we build a semantically-aware retrieval system for domain-specific medical knowledge that preserves document structure and enables natural language queries?

### Key Challenges
*   Traditional keyword search fails to capture semantic meaning in medical texts.
*   PDF extraction often loses structural information (tables, formulas, sections).
*   Need for real-time responses with source attribution for medical accuracy.
*   Challenge of scaling vector search for production deployment.

## Project Motivation
*   Traditional Ayurvedic texts contain invaluable medical knowledge, but they're practically inaccessible — searching a 241-page PDF manually takes 10-15 minutes.
*   Pure ChatGPT can't access this specific content and often hallucinates medical facts.
*   Our RAG system bridges both gaps: natural language search with faster response time, and every answer is grounded in the official Ayurvedic Pharmacopoeia with page references.
*   Plus, we gain hands-on experience with production AI technologies that are in demand in the industry.

## Objectives
This paper presents **Ayucheck**, an intelligent Knowledge Assistant that:
1.  Preserves document structure using **MinerU**.
2.  Enables semantic search using **Vector Embeddings**.
3.  Provides accurate, cited answers using **RAG**.

## Paper Organization
Section II reviews existing literature. Section III details the methodology. Section IV presents results. Section V concludes.
