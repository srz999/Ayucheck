/**
 * Graph RAG Implementation for Ayurvedic Knowledge Base
 * 
 * This module implements a knowledge graph-based RAG system that:
 * 1. Extracts entities (herbs, diseases, properties) from documents
 * 2. Identifies relationships between entities
 * 3. Builds a navigable knowledge graph
 * 4. Performs graph-based retrieval for RAG
 */

export interface GraphEntity {
  id: string;
  type: 'herb' | 'disease' | 'property' | 'treatment' | 'dosha' | 'preparation' | 'symptom';
  name: string;
  aliases: string[];
  description?: string;
  sourceChunks: string[]; // IDs of chunks where this entity appears
  metadata: Record<string, any>;
}

export interface GraphRelationship {
  id: string;
  type: 'treats' | 'causes' | 'contains' | 'prepared_from' | 'has_property' | 'balances' | 'aggravates' | 'used_for' | 'symptom_of';
  source: string; // entity ID
  target: string; // entity ID
  weight: number; // confidence/strength of relationship
  sourceChunks: string[]; // IDs of chunks supporting this relationship
  metadata: Record<string, any>;
}

export interface KnowledgeGraph {
  entities: Map<string, GraphEntity>;
  relationships: Map<string, GraphRelationship>;
  entityIndex: Map<string, Set<string>>; // type -> entity IDs
  relationshipIndex: Map<string, Set<string>>; // entity ID -> relationship IDs
}

/**
 * Entity Extractor - identifies entities in text chunks
 */
export class AyurvedicEntityExtractor {
  // Known Ayurvedic terms and patterns
  private static readonly HERB_PATTERNS = [
    /\b(Amalaki|Haritaki|Bibhitaki|Ashwagandha|Brahmi|Tulsi|Neem|Guduchi|Triphala|Guggulu|Shatavari|Arjuna|Bhringaraj|Manjistha|Punarnava|Ajagandha)\b/gi,
    /\b([A-Z][a-z]+)\s+\(.*?\)/g, // Scientific names in parentheses
  ];

  private static readonly DOSHA_PATTERNS = [
    /\b(Vata|Pitta|Kapha|Tridosha)\b/gi,
  ];

  private static readonly DISEASE_PATTERNS = [
    /\b(fever|cough|cold|diarrhea|dysentery|skin diseases?|digestive disorders?|respiratory conditions?|mental health|stress|anxiety|insomnia)\b/gi,
  ];

  private static readonly PROPERTY_PATTERNS = [
    /\b(anti-inflammatory|antioxidant|antibacterial|digestive|laxative|carminative|expectorant|diuretic|analgesic|antipyretic|tonic|rejuvenative)\b/gi,
  ];

  /**
   * Extract entities from text
   */
  extractEntities(text: string, chunkId: string): GraphEntity[] {
    const entities: GraphEntity[] = [];
    const seen = new Set<string>();

    // Extract herbs
    AyurvedicEntityExtractor.HERB_PATTERNS.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const name = match[0].trim();
        const normalizedName = name.toLowerCase();
        
        if (!seen.has(normalizedName)) {
          seen.add(normalizedName);
          entities.push({
            id: `herb_${normalizedName.replace(/\s+/g, '_')}`,
            type: 'herb',
            name: name,
            aliases: [normalizedName],
            sourceChunks: [chunkId],
            metadata: { extractedFrom: text.substring(Math.max(0, match.index! - 50), Math.min(text.length, match.index! + 50)) }
          });
        }
      }
    });

    // Extract doshas
    const doshaMatches = text.matchAll(AyurvedicEntityExtractor.DOSHA_PATTERNS[0]);
    for (const match of doshaMatches) {
      const name = match[0].trim();
      const normalizedName = name.toLowerCase();
      
      if (!seen.has(normalizedName)) {
        seen.add(normalizedName);
        entities.push({
          id: `dosha_${normalizedName}`,
          type: 'dosha',
          name: name,
          aliases: [normalizedName],
          sourceChunks: [chunkId],
          metadata: {}
        });
      }
    }

    // Extract diseases
    AyurvedicEntityExtractor.DISEASE_PATTERNS.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const name = match[0].trim();
        const normalizedName = name.toLowerCase();
        
        if (!seen.has(normalizedName)) {
          seen.add(normalizedName);
          entities.push({
            id: `disease_${normalizedName.replace(/\s+/g, '_')}`,
            type: 'disease',
            name: name,
            aliases: [normalizedName],
            sourceChunks: [chunkId],
            metadata: {}
          });
        }
      }
    });

    // Extract properties
    AyurvedicEntityExtractor.PROPERTY_PATTERNS.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const name = match[0].trim();
        const normalizedName = name.toLowerCase();
        
        if (!seen.has(normalizedName)) {
          seen.add(normalizedName);
          entities.push({
            id: `property_${normalizedName.replace(/\s+/g, '_')}`,
            type: 'property',
            name: name,
            aliases: [normalizedName],
            sourceChunks: [chunkId],
            metadata: {}
          });
        }
      }
    });

    return entities;
  }
}

/**
 * Relationship Extractor - identifies relationships between entities
 */
export class AyurvedicRelationshipExtractor {
  private static readonly RELATIONSHIP_PATTERNS = [
    // Treatment relationships
    { pattern: /(\w+)\s+(?:is\s+)?(?:used\s+)?(?:for\s+)?(?:treating|treats|treatment\s+of)\s+(\w+)/gi, type: 'treats' as const },
    { pattern: /(\w+)\s+(?:is\s+)?(?:effective\s+)?(?:for|against)\s+(\w+)/gi, type: 'treats' as const },
    
    // Property relationships
    { pattern: /(\w+)\s+(?:has|possesses|contains)\s+(\w+)\s+propert(?:y|ies)/gi, type: 'has_property' as const },
    { pattern: /(\w+)\s+(?:is\s+)?(?:an?\s+)?(\w+)/gi, type: 'has_property' as const },
    
    // Dosha relationships
    { pattern: /(\w+)\s+(?:balances|pacifies|reduces)\s+(vata|pitta|kapha)/gi, type: 'balances' as const },
    { pattern: /(\w+)\s+(?:aggravates|increases)\s+(vata|pitta|kapha)/gi, type: 'aggravates' as const },
    
    // Preparation relationships
    { pattern: /(\w+)\s+(?:is\s+)?(?:prepared\s+from|derived\s+from|made\s+from)\s+(\w+)/gi, type: 'prepared_from' as const },
  ];

  /**
   * Extract relationships from text with entity context
   */
  extractRelationships(
    text: string, 
    chunkId: string, 
    entities: GraphEntity[]
  ): GraphRelationship[] {
    const relationships: GraphRelationship[] = [];
    const entityMap = new Map(entities.map(e => [e.name.toLowerCase(), e]));

    // Try to find relationships using patterns
    AyurvedicRelationshipExtractor.RELATIONSHIP_PATTERNS.forEach(({ pattern, type }) => {
      const matches = text.matchAll(new RegExp(pattern.source, pattern.flags));
      for (const match of matches) {
        const source = match[1]?.trim().toLowerCase();
        const target = match[2]?.trim().toLowerCase();

        const sourceEntity = entityMap.get(source);
        const targetEntity = entityMap.get(target);

        if (sourceEntity && targetEntity) {
          const relId = `${type}_${sourceEntity.id}_${targetEntity.id}`;
          relationships.push({
            id: relId,
            type,
            source: sourceEntity.id,
            target: targetEntity.id,
            weight: 1.0,
            sourceChunks: [chunkId],
            metadata: {
              extractedText: match[0]
            }
          });
        }
      }
    });

    // Co-occurrence based relationships (entities mentioned together)
    const entityPairs: [GraphEntity, GraphEntity][] = [];
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        entityPairs.push([entities[i], entities[j]]);
      }
    }

    for (const [entity1, entity2] of entityPairs) {
      // Create a weak "related_to" relationship based on co-occurrence
      if (entity1.type === 'herb' && entity2.type === 'disease') {
        relationships.push({
          id: `used_for_${entity1.id}_${entity2.id}`,
          type: 'used_for',
          source: entity1.id,
          target: entity2.id,
          weight: 0.5, // Lower weight for co-occurrence
          sourceChunks: [chunkId],
          metadata: { inferredFromCooccurrence: true }
        });
      }
    }

    return relationships;
  }
}

/**
 * Knowledge Graph Builder and Manager
 */
export class KnowledgeGraphBuilder {
  private graph: KnowledgeGraph;
  private entityExtractor: AyurvedicEntityExtractor;
  private relationshipExtractor: AyurvedicRelationshipExtractor;

  constructor() {
    this.graph = {
      entities: new Map(),
      relationships: new Map(),
      entityIndex: new Map(),
      relationshipIndex: new Map(),
    };
    this.entityExtractor = new AyurvedicEntityExtractor();
    this.relationshipExtractor = new AyurvedicRelationshipExtractor();
  }

  /**
   * Build knowledge graph from document chunks
   */
  buildFromChunks(chunks: { id: string; text: string }[]): KnowledgeGraph {
    console.log(`🔨 Building knowledge graph from ${chunks.length} chunks...`);

    // Extract entities from all chunks
    for (const chunk of chunks) {
      const entities = this.entityExtractor.extractEntities(chunk.text, chunk.id);
      
      for (const entity of entities) {
        this.addEntity(entity);
      }
    }

    console.log(`✅ Extracted ${this.graph.entities.size} unique entities`);

    // Extract relationships
    let relationshipCount = 0;
    for (const chunk of chunks) {
      const chunkEntities = this.entityExtractor.extractEntities(chunk.text, chunk.id);
      const relationships = this.relationshipExtractor.extractRelationships(
        chunk.text,
        chunk.id,
        chunkEntities
      );
      
      for (const relationship of relationships) {
        this.addRelationship(relationship);
        relationshipCount++;
      }
    }

    console.log(`✅ Extracted ${relationshipCount} relationships`);

    return this.graph;
  }

  /**
   * Add or merge entity into graph
   */
  private addEntity(entity: GraphEntity): void {
    const existing = this.graph.entities.get(entity.id);
    
    if (existing) {
      // Merge source chunks
      existing.sourceChunks = [...new Set([...existing.sourceChunks, ...entity.sourceChunks])];
      // Merge aliases
      existing.aliases = [...new Set([...existing.aliases, ...entity.aliases])];
    } else {
      this.graph.entities.set(entity.id, entity);
      
      // Update index
      if (!this.graph.entityIndex.has(entity.type)) {
        this.graph.entityIndex.set(entity.type, new Set());
      }
      this.graph.entityIndex.get(entity.type)!.add(entity.id);
    }
  }

  /**
   * Add or merge relationship into graph
   */
  private addRelationship(relationship: GraphRelationship): void {
    const existing = this.graph.relationships.get(relationship.id);
    
    if (existing) {
      // Increase weight and merge source chunks
      existing.weight += relationship.weight;
      existing.sourceChunks = [...new Set([...existing.sourceChunks, ...relationship.sourceChunks])];
    } else {
      this.graph.relationships.set(relationship.id, relationship);
      
      // Update relationship index for both source and target
      if (!this.graph.relationshipIndex.has(relationship.source)) {
        this.graph.relationshipIndex.set(relationship.source, new Set());
      }
      this.graph.relationshipIndex.get(relationship.source)!.add(relationship.id);
      
      if (!this.graph.relationshipIndex.has(relationship.target)) {
        this.graph.relationshipIndex.set(relationship.target, new Set());
      }
      this.graph.relationshipIndex.get(relationship.target)!.add(relationship.id);
    }
  }

  /**
   * Get the built knowledge graph
   */
  getGraph(): KnowledgeGraph {
    return this.graph;
  }

  /**
   * Get graph statistics
   */
  getStats() {
    const entityTypeCount = new Map<string, number>();
    for (const [type, entities] of this.graph.entityIndex.entries()) {
      entityTypeCount.set(type, entities.size);
    }

    const relationshipTypeCount = new Map<string, number>();
    for (const rel of this.graph.relationships.values()) {
      relationshipTypeCount.set(rel.type, (relationshipTypeCount.get(rel.type) || 0) + 1);
    }

    return {
      totalEntities: this.graph.entities.size,
      totalRelationships: this.graph.relationships.size,
      entitiesByType: Object.fromEntries(entityTypeCount),
      relationshipsByType: Object.fromEntries(relationshipTypeCount),
    };
  }
}

/**
 * Graph-based Retrieval for RAG
 */
export class GraphRAGRetriever {
  private graph: KnowledgeGraph;

  constructor(graph: KnowledgeGraph) {
    this.graph = graph;
  }

  /**
   * Find entities matching a query
   */
  findEntities(query: string, limit: number = 10): GraphEntity[] {
    const queryLower = query.toLowerCase();
    const matches: { entity: GraphEntity; score: number }[] = [];

    for (const entity of this.graph.entities.values()) {
      let score = 0;
      
      // Exact name match
      if (entity.name.toLowerCase() === queryLower) {
        score += 10;
      } else if (entity.name.toLowerCase().includes(queryLower)) {
        score += 5;
      }

      // Alias matches
      for (const alias of entity.aliases) {
        if (alias === queryLower) {
          score += 8;
        } else if (alias.includes(queryLower)) {
          score += 3;
        }
      }

      // Word matches
      const queryWords = queryLower.split(/\s+/);
      const nameWords = entity.name.toLowerCase().split(/\s+/);
      for (const qWord of queryWords) {
        if (qWord.length > 2 && nameWords.some(nWord => nWord.includes(qWord))) {
          score += 2;
        }
      }

      if (score > 0) {
        matches.push({ entity, score });
      }
    }

    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(m => m.entity);
  }

  /**
   * Get relationships for an entity
   */
  getEntityRelationships(entityId: string): GraphRelationship[] {
    const relationshipIds = this.graph.relationshipIndex.get(entityId) || new Set();
    return Array.from(relationshipIds)
      .map(id => this.graph.relationships.get(id))
      .filter((rel): rel is GraphRelationship => rel !== undefined);
  }

  /**
   * Get neighboring entities (entities connected via relationships)
   */
  getNeighboringEntities(entityId: string, maxDepth: number = 1): GraphEntity[] {
    const visited = new Set<string>();
    const neighbors: GraphEntity[] = [];
    
    const traverse = (currentId: string, depth: number) => {
      if (depth > maxDepth || visited.has(currentId)) return;
      visited.add(currentId);

      const relationships = this.getEntityRelationships(currentId);
      for (const rel of relationships) {
        const neighborId = rel.source === currentId ? rel.target : rel.source;
        const neighbor = this.graph.entities.get(neighborId);
        
        if (neighbor && !visited.has(neighborId)) {
          neighbors.push(neighbor);
          traverse(neighborId, depth + 1);
        }
      }
    };

    traverse(entityId, 0);
    return neighbors;
  }

  /**
   * Retrieve context for RAG based on query
   * Returns relevant entities, relationships, and source chunks
   */
  retrieveContext(query: string, maxEntities: number = 5): {
    entities: GraphEntity[];
    relationships: GraphRelationship[];
    sourceChunks: Set<string>;
    contextText: string;
  } {
    // Find relevant entities
    const entities = this.findEntities(query, maxEntities);
    
    // Collect relationships involving these entities
    const relationships: GraphRelationship[] = [];
    const sourceChunks = new Set<string>();

    for (const entity of entities) {
      // Add entity source chunks
      entity.sourceChunks.forEach(chunk => sourceChunks.add(chunk));

      // Get entity relationships
      const entityRels = this.getEntityRelationships(entity.id);
      relationships.push(...entityRels);

      // Add relationship source chunks
      entityRels.forEach(rel => {
        rel.sourceChunks.forEach(chunk => sourceChunks.add(chunk));
      });
    }

    // Build context text
    const contextText = this.buildContextText(entities, relationships);

    return {
      entities,
      relationships,
      sourceChunks,
      contextText,
    };
  }

  /**
   * Build formatted context text from entities and relationships
   */
  private buildContextText(entities: GraphEntity[], relationships: GraphRelationship[]): string {
    const lines: string[] = [];

    // Add entities
    if (entities.length > 0) {
      lines.push('=== ENTITIES ===');
      for (const entity of entities) {
        lines.push(`- ${entity.name} (${entity.type})`);
        if (entity.description) {
          lines.push(`  Description: ${entity.description}`);
        }
      }
      lines.push('');
    }

    // Add relationships
    if (relationships.length > 0) {
      lines.push('=== RELATIONSHIPS ===');
      const uniqueRels = new Map<string, GraphRelationship>();
      for (const rel of relationships) {
        uniqueRels.set(rel.id, rel);
      }

      for (const rel of uniqueRels.values()) {
        const sourceEntity = this.graph.entities.get(rel.source);
        const targetEntity = this.graph.entities.get(rel.target);
        
        if (sourceEntity && targetEntity) {
          lines.push(`- ${sourceEntity.name} ${rel.type.replace(/_/g, ' ')} ${targetEntity.name}`);
        }
      }
    }

    return lines.join('\n');
  }
}
