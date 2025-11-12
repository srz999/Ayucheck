/**
 * Embedding Cache System
 * 
 * Caches embeddings to reduce OpenAI API calls and improve performance.
 * Implements LRU cache with persistence support.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface CacheEntry {
  embedding: number[];
  timestamp: number;
  modelName: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

/**
 * LRU Cache for embeddings
 */
export class EmbeddingCache {
  private cache: Map<string, CacheEntry>;
  private accessOrder: string[]; // Track access order for LRU
  private maxSize: number;
  private hits: number = 0;
  private misses: number = 0;
  private persistPath: string | null;

  constructor(maxSize: number = 1000, persistPath?: string) {
    this.cache = new Map();
    this.accessOrder = [];
    this.maxSize = maxSize;
    this.persistPath = persistPath || null;

    // Load persisted cache if available
    if (this.persistPath) {
      this.loadFromDisk();
    }
  }

  /**
   * Generate cache key from text and model
   */
  private generateKey(text: string, modelName: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(text);
    hash.update(modelName);
    return hash.digest('hex');
  }

  /**
   * Get embedding from cache
   */
  get(text: string, modelName: string): number[] | null {
    const key = this.generateKey(text, modelName);
    const entry = this.cache.get(key);

    if (entry) {
      this.hits++;
      // Update access order (move to end)
      this.updateAccessOrder(key);
      return entry.embedding;
    }

    this.misses++;
    return null;
  }

  /**
   * Set embedding in cache
   */
  set(text: string, modelName: string, embedding: number[]): void {
    const key = this.generateKey(text, modelName);
    
    // If cache is full, remove least recently used item
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry = {
      embedding,
      timestamp: Date.now(),
      modelName,
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);

    // Persist to disk if enabled
    if (this.persistPath && this.cache.size % 10 === 0) {
      // Persist every 10 additions to reduce I/O
      this.saveToDisk();
    }
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    // Remove key from current position
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder.shift();
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Save cache to disk
   */
  private saveToDisk(): void {
    if (!this.persistPath) return;

    try {
      const cacheData = {
        entries: Array.from(this.cache.entries()),
        accessOrder: this.accessOrder,
        stats: { hits: this.hits, misses: this.misses },
      };

      const dir = path.dirname(this.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.persistPath, JSON.stringify(cacheData, null, 2));
      console.log(`💾 Embedding cache persisted to ${this.persistPath}`);
    } catch (error) {
      console.error('❌ Failed to save cache to disk:', error);
    }
  }

  /**
   * Load cache from disk
   */
  private loadFromDisk(): void {
    if (!this.persistPath) return;

    try {
      if (fs.existsSync(this.persistPath)) {
        const data = fs.readFileSync(this.persistPath, 'utf-8');
        const cacheData = JSON.parse(data);

        this.cache = new Map(cacheData.entries);
        this.accessOrder = cacheData.accessOrder || [];
        this.hits = cacheData.stats?.hits || 0;
        this.misses = cacheData.stats?.misses || 0;

        console.log(`✅ Loaded ${this.cache.size} embeddings from cache`);
      }
    } catch (error) {
      console.error('❌ Failed to load cache from disk:', error);
    }
  }

  /**
   * Get cache size in bytes (approximate)
   */
  getSizeInBytes(): number {
    let totalSize = 0;
    this.cache.forEach((entry) => {
      // Each float64 is 8 bytes
      totalSize += entry.embedding.length * 8;
      // Add overhead for other fields
      totalSize += 100; // Approximate overhead
    });
    return totalSize;
  }

  /**
   * Export cache for analysis
   */
  export(): any {
    return {
      stats: this.getStats(),
      size: this.cache.size,
      sizeInBytes: this.getSizeInBytes(),
      sizeInMB: (this.getSizeInBytes() / (1024 * 1024)).toFixed(2),
    };
  }
}

/**
 * Global embedding cache instance
 */
let globalCache: EmbeddingCache | null = null;

/**
 * Get or create global cache instance
 */
export function getEmbeddingCache(maxSize: number = 1000): EmbeddingCache {
  if (!globalCache) {
    const cacheDir = path.join(process.cwd(), '.cache');
    const cachePath = path.join(cacheDir, 'embeddings.json');
    globalCache = new EmbeddingCache(maxSize, cachePath);
  }
  return globalCache;
}

/**
 * Clear global cache
 */
export function clearEmbeddingCache(): void {
  if (globalCache) {
    globalCache.clear();
  }
}
