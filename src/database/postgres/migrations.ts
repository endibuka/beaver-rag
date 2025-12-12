/**
 * PostgreSQL schema migrations and setup
 */

import { Pool } from 'pg';
import { DatabaseError } from '../../core/errors.js';

/**
 * Options for database initialization
 */
export interface InitOptions {
  /** Name of the table to create (default: 'rag_documents') */
  tableName?: string;
  /** Number of dimensions for the embedding vector */
  dimensions: number;
}

/**
 * Create the pgvector extension
 * @param pool - PostgreSQL connection pool
 */
export async function createVectorExtension(pool: Pool): Promise<void> {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
  } catch (error: any) {
    throw new DatabaseError(
      'Failed to create pgvector extension',
      'CREATE EXTENSION vector',
      error.code
    );
  }
}

/**
 * Create the documents table with vector support
 * @param pool - PostgreSQL connection pool
 * @param options - Initialization options
 */
export async function createDocumentsTable(
  pool: Pool,
  options: InitOptions
): Promise<void> {
  const tableName = options.tableName || 'rag_documents';
  const dimensions = options.dimensions;

  const query = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      embedding vector(${dimensions}),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  try {
    await pool.query(query);
  } catch (error: any) {
    throw new DatabaseError(
      `Failed to create table ${tableName}`,
      query,
      error.code
    );
  }
}

/**
 * Create HNSW index for fast vector similarity search
 * @param pool - PostgreSQL connection pool
 * @param tableName - Name of the table
 * @param indexOptions - Index creation options
 */
export async function createHNSWIndex(
  pool: Pool,
  tableName: string = 'rag_documents',
  indexOptions?: { m?: number; efConstruction?: number }
): Promise<void> {
  const m = indexOptions?.m || 16;
  const efConstruction = indexOptions?.efConstruction || 64;

  const indexName = `${tableName}_embedding_hnsw_idx`;

  // Check if index already exists
  const checkQuery = `
    SELECT 1
    FROM pg_indexes
    WHERE tablename = $1 AND indexname = $2
  `;

  try {
    const result = await pool.query(checkQuery, [tableName, indexName]);

    if (result.rows.length > 0) {
      // Index already exists
      return;
    }

    const createQuery = `
      CREATE INDEX ${indexName} ON ${tableName}
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = ${m}, ef_construction = ${efConstruction})
    `;

    await pool.query(createQuery);
  } catch (error: any) {
    throw new DatabaseError(
      `Failed to create HNSW index on ${tableName}`,
      `CREATE INDEX ${indexName}`,
      error.code
    );
  }
}

/**
 * Create GIN index for metadata filtering
 * @param pool - PostgreSQL connection pool
 * @param tableName - Name of the table
 */
export async function createMetadataIndex(
  pool: Pool,
  tableName: string = 'rag_documents'
): Promise<void> {
  const indexName = `${tableName}_metadata_gin_idx`;

  // Check if index already exists
  const checkQuery = `
    SELECT 1
    FROM pg_indexes
    WHERE tablename = $1 AND indexname = $2
  `;

  try {
    const result = await pool.query(checkQuery, [tableName, indexName]);

    if (result.rows.length > 0) {
      // Index already exists
      return;
    }

    const createQuery = `
      CREATE INDEX ${indexName} ON ${tableName}
      USING gin (metadata)
    `;

    await pool.query(createQuery);
  } catch (error: any) {
    throw new DatabaseError(
      `Failed to create GIN index on ${tableName}`,
      `CREATE INDEX ${indexName}`,
      error.code
    );
  }
}

/**
 * Create updated_at trigger function
 * @param pool - PostgreSQL connection pool
 */
export async function createUpdatedAtTrigger(
  pool: Pool,
  tableName: string = 'rag_documents'
): Promise<void> {
  // Create or replace the trigger function
  const functionQuery = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql'
  `;

  const triggerQuery = `
    DROP TRIGGER IF EXISTS update_${tableName}_updated_at ON ${tableName};
    CREATE TRIGGER update_${tableName}_updated_at
      BEFORE UPDATE ON ${tableName}
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
  `;

  try {
    await pool.query(functionQuery);
    await pool.query(triggerQuery);
  } catch (error: any) {
    throw new DatabaseError(
      `Failed to create updated_at trigger for ${tableName}`,
      triggerQuery,
      error.code
    );
  }
}
