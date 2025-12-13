/**
 * Next.js helpers for beaver-rag
 * Simplifies setup and handles singleton pattern
 */

import { RAGClient } from '../core/rag-client.js';
import { OpenAIEmbeddings, OpenAIEmbeddingModel } from '../embeddings/openai.js';
import { CohereEmbeddings, CohereEmbeddingModel } from '../embeddings/cohere.js';
import { PostgresDatabase } from '../database/postgres/index.js';

let cachedRAGClient: RAGClient | null = null;

/**
 * Configuration options for Next.js RAG client
 */
export interface NextjsRAGConfig {
  /** Embedding provider type */
  provider: 'openai' | 'cohere';
  /** API key for the provider (defaults to env vars) */
  apiKey?: string;
  /** Model to use (defaults based on provider) */
  model?: OpenAIEmbeddingModel | CohereEmbeddingModel;
  /** Database connection string (defaults to DATABASE_URL env var) */
  databaseUrl?: string;
  /** PostgreSQL configuration (if not using connection string) */
  database?: {
    user?: string;
    password?: string;
    host?: string;
    port?: number;
    database?: string;
  };
}

/**
 * Get or create a singleton RAG client for Next.js
 * Automatically handles initialization and reuse across requests
 *
 * @example
 * ```ts
 * // In API route
 * import { getRAGClient } from 'beaver-rag/utils/nextjs';
 *
 * export async function POST(request: Request) {
 *   const rag = await getRAGClient({ provider: 'openai' });
 *   const results = await rag.search(query);
 *   return Response.json({ results });
 * }
 * ```
 */
export async function getRAGClient(config?: NextjsRAGConfig): Promise<RAGClient> {
  // Return cached instance if exists and no new config
  if (cachedRAGClient && !config) {
    return cachedRAGClient;
  }

  // Default configuration
  const provider = config?.provider || 'openai';
  const apiKey = config?.apiKey ||
    (provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.COHERE_API_KEY);

  if (!apiKey) {
    throw new Error(
      `API key not found. Set ${provider === 'openai' ? 'OPENAI_API_KEY' : 'COHERE_API_KEY'} environment variable or pass apiKey in config.`
    );
  }

  // Create embeddings provider
  let embeddings;
  if (provider === 'openai') {
    embeddings = new OpenAIEmbeddings({
      apiKey,
      model: (config?.model as OpenAIEmbeddingModel) || 'text-embedding-3-small',
    });
  } else {
    embeddings = new CohereEmbeddings({
      apiKey,
      model: (config?.model as CohereEmbeddingModel) || 'embed-english-v3.0',
    });
  }

  // Create database provider
  const databaseUrl = config?.databaseUrl || process.env.DATABASE_URL;

  let database;
  if (databaseUrl) {
    database = new PostgresDatabase({ connectionString: databaseUrl });
  } else if (config?.database) {
    // Build connection string from individual parameters
    const user = config.database.user || process.env.POSTGRES_USER || 'postgres';
    const password = config.database.password || process.env.POSTGRES_PASSWORD || '';
    const host = config.database.host || process.env.POSTGRES_HOST || 'localhost';
    const port = config.database.port || parseInt(process.env.POSTGRES_PORT || '5432');
    const dbName = config.database.database || process.env.POSTGRES_DB || 'postgres';

    const connectionString = `postgresql://${user}:${password}@${host}:${port}/${dbName}`;
    database = new PostgresDatabase({ connectionString });
  } else {
    throw new Error(
      'Database configuration not found. Set DATABASE_URL environment variable or provide database config.'
    );
  }

  // Create and initialize RAG client
  const ragClient = new RAGClient({
    embeddings,
    database,
  });

  await ragClient.initialize();

  // Cache for reuse
  cachedRAGClient = ragClient;

  return ragClient;
}

/**
 * Clear the cached RAG client (useful for testing or manual cleanup)
 */
export async function clearRAGClient(): Promise<void> {
  if (cachedRAGClient) {
    await cachedRAGClient.close();
    cachedRAGClient = null;
  }
}
