/**
 * RAG Client - Main orchestrator for the RAG system
 */

import { EmbeddingsProvider } from '../embeddings/base.js';
import { DatabaseProvider } from '../database/base.js';
import { ChunkingStrategy } from '../chunking/base.js';
import { RecursiveChunking } from '../chunking/recursive.js';
import { Document, DocumentInput, SearchOptions, SearchResult, RAGConfig } from './types.js';
import { RAGError, ValidationError } from './errors.js';
import { randomUUID } from 'crypto';

/**
 * RAG Client - Main API for the RAG system
 * Orchestrates document ingestion, embedding generation, and retrieval
 */
export class RAGClient {
  private embeddings: EmbeddingsProvider;
  private database: DatabaseProvider;
  private chunking: ChunkingStrategy;
  private initialized: boolean = false;

  constructor(config: RAGConfig) {
    if (!config.embeddings) {
      throw new ValidationError('Embeddings provider is required', 'embeddings');
    }

    if (!config.database) {
      throw new ValidationError('Database provider is required', 'database');
    }

    this.embeddings = config.embeddings;
    this.database = config.database;

    // Use provided chunking strategy or default to RecursiveChunking
    this.chunking =
      config.chunking ||
      new RecursiveChunking({
        chunkSize: 400,
        chunkOverlap: 80,
      });
  }

  /**
   * Initialize the RAG system
   * Connects to the database and sets up schema/indexes
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Connect to database
    await this.database.connect();

    // Initialize database (create tables, extensions, indexes)
    await this.database.initialize();

    // Validate embedding dimensions match database
    const storedDimensions = await this.database.getVectorDimensions();
    if (storedDimensions && storedDimensions !== this.embeddings.dimensions) {
      throw new RAGError(
        `Dimension mismatch: Database has ${storedDimensions}-dimensional vectors, ` +
          `but embeddings provider produces ${this.embeddings.dimensions}-dimensional vectors`
      );
    }

    this.initialized = true;
  }

  /**
   * Add a single document to the RAG system
   * Automatically chunks the document, generates embeddings, and stores in the database
   * @param content - The text content of the document
   * @param metadata - Optional metadata to attach to the document
   * @returns The ID of the added document (or first chunk if chunked)
   */
  async addDocument(content: string, metadata?: Record<string, any>): Promise<string> {
    this.ensureInitialized();

    if (!content || content.trim().length === 0) {
      throw new ValidationError('Document content cannot be empty', 'content');
    }

    // Chunk the document
    const chunks = this.chunking.chunk(content);

    if (chunks.length === 0) {
      throw new RAGError('Chunking produced no chunks');
    }

    // Extract text from chunks
    const chunkTexts = chunks.map((chunk) => chunk.content);

    // Generate embeddings for all chunks
    const embeddingResult = await this.embeddings.embedBatch(chunkTexts);

    // Create documents for each chunk
    const documents: Omit<Document, 'createdAt' | 'updatedAt'>[] = chunks.map((chunk, index) => {
      const chunkMetadata = {
        ...metadata,
        ...chunk.metadata,
        originalContent: content,
      };

      return {
        id: index === 0 ? randomUUID() : `${randomUUID()}`,
        content: chunk.content,
        embedding: embeddingResult.embeddings[index],
        metadata: chunkMetadata,
      };
    });

    // Store all chunks in the database
    await this.database.upsertDocuments(documents);

    // Return the ID of the first chunk
    return documents[0].id;
  }

  /**
   * Add multiple documents to the RAG system
   * @param docs - Array of documents to add
   * @returns Array of document IDs (first chunk ID for each document)
   */
  async addDocuments(docs: DocumentInput[]): Promise<string[]> {
    this.ensureInitialized();

    if (docs.length === 0) {
      return [];
    }

    const ids: string[] = [];

    // Process documents in batches for efficiency
    for (const doc of docs) {
      const id = await this.addDocument(doc.content, doc.metadata);
      ids.push(id);
    }

    return ids;
  }

  /**
   * Update a document in the RAG system
   * Re-chunks, re-embeds, and updates in the database
   * @param id - The document ID to update
   * @param content - The new content
   * @param metadata - Optional new metadata
   */
  async updateDocument(
    id: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    this.ensureInitialized();

    // Delete the old document first
    await this.deleteDocument(id);

    // Add the new version with the same ID
    const chunks = this.chunking.chunk(content);
    const chunkTexts = chunks.map((chunk) => chunk.content);
    const embeddingResult = await this.embeddings.embedBatch(chunkTexts);

    const documents: Omit<Document, 'createdAt' | 'updatedAt'>[] = chunks.map((chunk, index) => {
      const chunkMetadata = {
        ...metadata,
        ...chunk.metadata,
        originalContent: content,
      };

      return {
        id: index === 0 ? id : `${id}-chunk-${index}`,
        content: chunk.content,
        embedding: embeddingResult.embeddings[index],
        metadata: chunkMetadata,
      };
    });

    await this.database.upsertDocuments(documents);
  }

  /**
   * Delete a document from the RAG system
   * @param id - The document ID to delete
   * @returns True if the document was deleted, false if not found
   */
  async deleteDocument(id: string): Promise<boolean> {
    this.ensureInitialized();

    return await this.database.deleteDocument(id);
  }

  /**
   * Search for relevant documents
   * @param query - The search query text
   * @param options - Search options (limit, filters, etc.)
   * @returns Array of search results ranked by similarity
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    this.ensureInitialized();

    if (!query || query.trim().length === 0) {
      throw new ValidationError('Search query cannot be empty', 'query');
    }

    // Generate embedding for the query
    const embeddingResult = await this.embeddings.embed(query);

    // Search the database
    const results = await this.database.search(embeddingResult.embedding, options);

    return results;
  }

  /**
   * Get a document by ID
   * @param id - The document ID
   * @returns The document if found, null otherwise
   */
  async getDocument(id: string): Promise<Document | null> {
    this.ensureInitialized();

    return await this.database.getDocument(id);
  }

  /**
   * Close the RAG client and disconnect from the database
   */
  async close(): Promise<void> {
    if (this.initialized) {
      await this.database.disconnect();
      this.initialized = false;
    }
  }

  /**
   * Check if the client is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the embeddings provider
   */
  getEmbeddingsProvider(): EmbeddingsProvider {
    return this.embeddings;
  }

  /**
   * Get the database provider
   */
  getDatabaseProvider(): DatabaseProvider {
    return this.database;
  }

  /**
   * Get the chunking strategy
   */
  getChunkingStrategy(): ChunkingStrategy {
    return this.chunking;
  }

  /**
   * Ensure the client is initialized before operations
   * @throws RAGError if not initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new RAGError(
        'RAG client is not initialized. Call initialize() before performing operations.'
      );
    }
  }
}
