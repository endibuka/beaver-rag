/**
 * Core type definitions for the RAG system
 */

/**
 * A document stored in the RAG system
 */
export interface Document<T = Record<string, any>> {
  /** Unique identifier for the document */
  id: string;
  /** The text content of the document */
  content: string;
  /** The embedding vector for the document */
  embedding: number[];
  /** Custom metadata attached to the document */
  metadata: T;
  /** Timestamp when the document was created */
  createdAt: Date;
  /** Timestamp when the document was last updated */
  updatedAt: Date;
}

/**
 * Options for searching documents
 */
export interface SearchOptions {
  /** Maximum number of results to return (default: 5) */
  limit?: number;
  /** Minimum similarity score (0-1) to include in results (default: 0.5) */
  minSimilarity?: number;
  /** Metadata filters to apply (exact match on metadata fields) */
  filters?: Record<string, any>;
  /** Maximum number of chunks from the same document (default: 2 for diversity) */
  maxChunksPerDocument?: number;
  /** Use adaptive threshold based on result distribution (default: false) */
  useAdaptiveThreshold?: boolean;
}

/**
 * A single search result with similarity score
 */
export interface SearchResult<T = Record<string, any>> {
  /** The matched document */
  document: Document<T>;
  /** Similarity score (0-1, higher is more similar) */
  similarity: number;
  /** Distance metric from the query vector */
  distance: number;
}

/**
 * Configuration for the RAG client
 */
export interface RAGConfig {
  /** The embeddings provider to use */
  embeddings: any;
  /** The database provider to use */
  database: any;
  /** Optional chunking strategy (uses RecursiveChunking by default) */
  chunking?: any;
}

/**
 * Input for adding a document
 */
export interface DocumentInput {
  /** The text content of the document */
  content: string;
  /** Optional metadata to attach to the document */
  metadata?: Record<string, any>;
}
