/**
 * PostgreSQL client wrapper with connection pooling
 */

import { Pool, PoolConfig } from 'pg';
import { DatabaseError } from '../../core/errors.js';

/**
 * PostgreSQL configuration options
 */
export interface PostgresConfig {
  /** PostgreSQL connection string */
  connectionString: string;
  /** Name of the table to use (default: 'rag_documents') */
  tableName?: string;
  /** Maximum number of connections in the pool (default: 20) */
  maxConnections?: number;
  /** Idle timeout in milliseconds (default: 30000) */
  idleTimeoutMillis?: number;
  /** Connection timeout in milliseconds (default: 2000) */
  connectionTimeoutMillis?: number;
}

/**
 * PostgreSQL client with connection pooling
 */
export class PostgresClient {
  private pool: Pool;
  public readonly tableName: string;
  private connected: boolean = false;

  constructor(config: PostgresConfig) {
    this.tableName = config.tableName || 'rag_documents';

    const poolConfig: PoolConfig = {
      connectionString: config.connectionString,
      max: config.maxConnections || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
    };

    this.pool = new Pool(poolConfig);

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }

  /**
   * Connect to the database and verify the connection
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // Test the connection
      const client = await this.pool.connect();
      client.release();
      this.connected = true;
    } catch (error: any) {
      throw new DatabaseError(
        'Failed to connect to PostgreSQL',
        undefined,
        error.code
      );
    }
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.pool.end();
      this.connected = false;
    } catch (error: any) {
      throw new DatabaseError(
        'Failed to disconnect from PostgreSQL',
        undefined,
        error.code
      );
    }
  }

  /**
   * Get the connection pool
   */
  getPool(): Pool {
    return this.pool;
  }

  /**
   * Execute a query
   */
  async query(text: string, params?: any[]): Promise<any> {
    try {
      return await this.pool.query(text, params);
    } catch (error: any) {
      throw new DatabaseError(
        `Query failed: ${error.message}`,
        text,
        error.code
      );
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}
