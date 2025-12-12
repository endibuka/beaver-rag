/**
 * PostgreSQL database provider with pgvector support
 */

import { DatabaseProvider } from '../base.js';
import { Document, SearchOptions, SearchResult } from '../../core/types.js';
import { DatabaseError, ValidationError } from '../../core/errors.js';
import { PostgresClient, PostgresConfig } from './client.js';
import {
  createVectorExtension,
  createDocumentsTable,
  createHNSWIndex,
  createMetadataIndex,
  createUpdatedAtTrigger,
} from './migrations.js';
import {
  buildSearchQuery,
  buildUpsertQuery,
  buildBatchUpsertQuery,
  buildGetQuery,
  buildDeleteQuery,
  buildDeleteManyQuery,
  buildGetDimensionsQuery,
} from './queries.js';

/**
 * PostgreSQL database provider options
 */
export interface PostgresDatabaseOptions extends PostgresConfig {
  /** Number of dimensions for embeddings */
  dimensions?: number;
  /** Type of index to create ('hnsw' or 'ivfflat', default: 'hnsw') */
  indexType?: 'hnsw' | 'ivfflat';
  /** Index options */
  indexOptions?: { m?: number; efConstruction?: number };
}

/**
 * PostgreSQL database provider with pgvector support
 */
export class PostgresDatabase extends DatabaseProvider {
  private client: PostgresClient;
  private dimensions: number;
  private indexType: 'hnsw' | 'ivfflat';
  private indexOptions?: { m?: number; efConstruction?: number };
  private initialized: boolean = false;

  constructor(options: PostgresDatabaseOptions) {
    super();
    this.client = new PostgresClient(options);
    this.dimensions = options.dimensions || 1536; // Default to OpenAI dimensions
    this.indexType = options.indexType || 'hnsw';
    this.indexOptions = options.indexOptions;
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const pool = this.client.getPool();

    // Create pgvector extension
    await createVectorExtension(pool);

    // Create documents table
    await createDocumentsTable(pool, {
      tableName: this.client.tableName,
      dimensions: this.dimensions,
    });

    // Create updated_at trigger
    await createUpdatedAtTrigger(pool, this.client.tableName);

    // Create indexes
    await this.createIndex();

    // Create metadata index
    await createMetadataIndex(pool, this.client.tableName);

    this.initialized = true;
  }

  async upsertDocument(
    doc: Omit<Document, 'createdAt' | 'updatedAt'>
  ): Promise<Document> {
    // Validate document
    if (!doc.id || !doc.content) {
      throw new ValidationError('Document must have id and content', 'id');
    }

    if (!doc.embedding || !Array.isArray(doc.embedding)) {
      throw new ValidationError('Document must have a valid embedding array', 'embedding');
    }

    if (doc.embedding.length !== this.dimensions) {
      throw new ValidationError(
        `Embedding dimensions mismatch: expected ${this.dimensions}, got ${doc.embedding.length}`,
        'embedding',
        doc.embedding.length
      );
    }

    const query = buildUpsertQuery(this.client.tableName);
    const params = [
      doc.id,
      doc.content,
      `[${doc.embedding.join(',')}]`, // Format as pgvector array
      JSON.stringify(doc.metadata || {}),
    ];

    const result = await this.client.query(query, params);

    return this.mapRowToDocument(result.rows[0]);
  }

  async upsertDocuments(
    docs: Omit<Document, 'createdAt' | 'updatedAt'>[]
  ): Promise<Document[]> {
    if (docs.length === 0) {
      return [];
    }

    // Validate all documents
    for (const doc of docs) {
      if (!doc.id || !doc.content) {
        throw new ValidationError('All documents must have id and content', 'id');
      }

      if (!doc.embedding || !Array.isArray(doc.embedding)) {
        throw new ValidationError('All documents must have valid embedding arrays', 'embedding');
      }

      if (doc.embedding.length !== this.dimensions) {
        throw new ValidationError(
          `Embedding dimensions mismatch: expected ${this.dimensions}, got ${doc.embedding.length}`,
          'embedding',
          doc.embedding.length
        );
      }
    }

    const query = buildBatchUpsertQuery(this.client.tableName, docs.length);
    const params: any[] = [];

    for (const doc of docs) {
      params.push(
        doc.id,
        doc.content,
        `[${doc.embedding.join(',')}]`,
        JSON.stringify(doc.metadata || {})
      );
    }

    const result = await this.client.query(query, params);

    return result.rows.map((row: any) => this.mapRowToDocument(row));
  }

  async getDocument(id: string): Promise<Document | null> {
    const query = buildGetQuery(this.client.tableName);
    const result = await this.client.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToDocument(result.rows[0]);
  }

  async deleteDocument(id: string): Promise<boolean> {
    const query = buildDeleteQuery(this.client.tableName);
    const result = await this.client.query(query, [id]);

    return result.rowCount > 0;
  }

  async deleteDocuments(ids: string[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const query = buildDeleteManyQuery(this.client.tableName);
    const result = await this.client.query(query, [ids]);

    return result.rowCount;
  }

  async search(
    queryEmbedding: number[],
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    // Validate query embedding
    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      throw new ValidationError('Query embedding must be a valid array', 'queryEmbedding');
    }

    if (queryEmbedding.length !== this.dimensions) {
      throw new ValidationError(
        `Query embedding dimensions mismatch: expected ${this.dimensions}, got ${queryEmbedding.length}`,
        'queryEmbedding',
        queryEmbedding.length
      );
    }

    const { query, params } = buildSearchQuery(this.client.tableName, options);

    // Replace the embedding placeholder
    params[0] = `[${queryEmbedding.join(',')}]`;

    const result = await this.client.query(query, params);

    return result.rows.map((row: any) => ({
      document: this.mapRowToDocument(row),
      similarity: parseFloat(row.similarity),
      distance: parseFloat(row.distance),
    }));
  }

  async createIndex(options?: any): Promise<void> {
    const pool = this.client.getPool();

    if (this.indexType === 'hnsw') {
      await createHNSWIndex(
        pool,
        this.client.tableName,
        options || this.indexOptions
      );
    } else {
      // Future: Add IVFFlat index support
      throw new DatabaseError('IVFFlat index not yet supported', undefined, undefined);
    }
  }

  async getVectorDimensions(): Promise<number | null> {
    const query = buildGetDimensionsQuery(this.client.tableName);

    try {
      const result = await this.client.query(query);

      if (result.rows.length === 0) {
        return null;
      }

      return parseInt(result.rows[0].dimensions, 10);
    } catch (error) {
      // Table might be empty
      return null;
    }
  }

  /**
   * Map a database row to a Document object
   */
  private mapRowToDocument(row: any): Document {
    return {
      id: row.id,
      content: row.content,
      embedding: Array.isArray(row.embedding)
        ? row.embedding
        : JSON.parse(row.embedding),
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Get the table name
   */
  getTableName(): string {
    return this.client.tableName;
  }
}
