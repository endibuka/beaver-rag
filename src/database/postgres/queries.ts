/**
 * PostgreSQL query builders
 */

import { SearchOptions } from '../../core/types.js';

/**
 * Build a search query with vector similarity and optional metadata filters
 * @param tableName - Name of the table to search
 * @param options - Search options
 * @returns SQL query and parameters
 */
export function buildSearchQuery(
  tableName: string,
  options?: SearchOptions
): { query: string; params: any[] } {
  const limit = options?.limit || 10;
  const minSimilarity = options?.minSimilarity;
  const filters = options?.filters;

  let query = `
    SELECT
      id,
      content,
      embedding,
      metadata,
      created_at,
      updated_at,
      1 - (embedding <=> $1) AS similarity,
      embedding <=> $1 AS distance
    FROM ${tableName}
  `;

  const params: any[] = [];
  let paramIndex = 1;

  // Add embedding as first parameter (will be added by caller)
  params.push(null); // Placeholder for embedding vector
  paramIndex++;

  // Add metadata filters if provided
  if (filters && Object.keys(filters).length > 0) {
    query += ` WHERE metadata @> $${paramIndex}`;
    params.push(JSON.stringify(filters));
    paramIndex++;
  }

  // Add similarity filter if provided
  if (minSimilarity !== undefined) {
    const whereOrAnd = filters ? 'AND' : 'WHERE';
    query += ` ${whereOrAnd} (1 - (embedding <=> $1)) >= $${paramIndex}`;
    params.push(minSimilarity);
    paramIndex++;
  }

  query += ` ORDER BY embedding <=> $1 LIMIT $${paramIndex}`;
  params.push(limit);

  return { query, params };
}

/**
 * Build an upsert query for a document
 * @param tableName - Name of the table
 * @returns SQL query
 */
export function buildUpsertQuery(tableName: string): string {
  return `
    INSERT INTO ${tableName} (id, content, embedding, metadata, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    ON CONFLICT (id)
    DO UPDATE SET
      content = EXCLUDED.content,
      embedding = EXCLUDED.embedding,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING id, content, embedding, metadata, created_at, updated_at
  `;
}

/**
 * Build a batch upsert query for multiple documents
 * @param tableName - Name of the table
 * @param count - Number of documents to upsert
 * @returns SQL query
 */
export function buildBatchUpsertQuery(
  tableName: string,
  count: number
): string {
  const values: string[] = [];

  for (let i = 0; i < count; i++) {
    const offset = i * 4;
    values.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, NOW(), NOW())`
    );
  }

  return `
    INSERT INTO ${tableName} (id, content, embedding, metadata, created_at, updated_at)
    VALUES ${values.join(', ')}
    ON CONFLICT (id)
    DO UPDATE SET
      content = EXCLUDED.content,
      embedding = EXCLUDED.embedding,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING id, content, embedding, metadata, created_at, updated_at
  `;
}

/**
 * Build a get document by ID query
 * @param tableName - Name of the table
 * @returns SQL query
 */
export function buildGetQuery(tableName: string): string {
  return `
    SELECT id, content, embedding, metadata, created_at, updated_at
    FROM ${tableName}
    WHERE id = $1
  `;
}

/**
 * Build a delete document by ID query
 * @param tableName - Name of the table
 * @returns SQL query
 */
export function buildDeleteQuery(tableName: string): string {
  return `
    DELETE FROM ${tableName}
    WHERE id = $1
  `;
}

/**
 * Build a delete multiple documents query
 * @param tableName - Name of the table
 * @returns SQL query
 */
export function buildDeleteManyQuery(tableName: string): string {
  return `
    DELETE FROM ${tableName}
    WHERE id = ANY($1)
  `;
}

/**
 * Build a query to get vector dimensions
 * @param tableName - Name of the table
 * @returns SQL query
 */
export function buildGetDimensionsQuery(tableName: string): string {
  return `
    SELECT vector_dims(embedding) as dimensions
    FROM ${tableName}
    WHERE embedding IS NOT NULL
    LIMIT 1
  `;
}
