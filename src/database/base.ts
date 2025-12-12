/**
 * Base classes and interfaces for database providers
 */

import { Document, SearchOptions, SearchResult } from '../core/types.js';

/**
 * Abstract base class for database providers
 * Extend this class to implement custom database providers
 */
export abstract class DatabaseProvider {
  /**
   * Connect to the database
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from the database
   */
  abstract disconnect(): Promise<void>;

  /**
   * Initialize the database (create tables, extensions, indexes, etc.)
   */
  abstract initialize(): Promise<void>;

  /**
   * Insert or update a document in the database
   * @param doc - The document to upsert (without timestamps)
   * @returns The upserted document with timestamps
   */
  abstract upsertDocument(
    doc: Omit<Document, 'createdAt' | 'updatedAt'>
  ): Promise<Document>;

  /**
   * Insert or update multiple documents in batch
   * @param docs - Array of documents to upsert
   * @returns Array of upserted documents with timestamps
   */
  abstract upsertDocuments(
    docs: Omit<Document, 'createdAt' | 'updatedAt'>[]
  ): Promise<Document[]>;

  /**
   * Get a document by ID
   * @param id - The document ID
   * @returns The document if found, null otherwise
   */
  abstract getDocument(id: string): Promise<Document | null>;

  /**
   * Delete a document by ID
   * @param id - The document ID
   * @returns True if the document was deleted, false if not found
   */
  abstract deleteDocument(id: string): Promise<boolean>;

  /**
   * Delete multiple documents by IDs
   * @param ids - Array of document IDs to delete
   * @returns Number of documents deleted
   */
  abstract deleteDocuments(ids: string[]): Promise<number>;

  /**
   * Search for documents by vector similarity
   * @param queryEmbedding - The query embedding vector
   * @param options - Search options (limit, filters, etc.)
   * @returns Array of search results ranked by similarity
   */
  abstract search(
    queryEmbedding: number[],
    options?: SearchOptions
  ): Promise<SearchResult[]>;

  /**
   * Create vector index for faster search
   * @param options - Database-specific index options
   */
  abstract createIndex(options?: any): Promise<void>;

  /**
   * Get the dimensions of stored vectors
   * @returns The vector dimensions, or null if no vectors exist
   */
  abstract getVectorDimensions(): Promise<number | null>;
}
