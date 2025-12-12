/**
 * Base classes and interfaces for embedding providers
 */

/**
 * Result of embedding a single text
 */
export interface EmbeddingResult {
  /** The embedding vector */
  embedding: number[];
  /** Number of tokens used */
  tokens: number;
}

/**
 * Result of embedding multiple texts in batch
 */
export interface BatchEmbeddingResult {
  /** Array of embedding vectors */
  embeddings: number[][];
  /** Total tokens used across all texts */
  totalTokens: number;
}

/**
 * Abstract base class for embedding providers
 * Extend this class to implement custom embedding providers
 */
export abstract class EmbeddingsProvider {
  /** Number of dimensions in the embedding vectors */
  abstract readonly dimensions: number;

  /** Maximum number of tokens that can be embedded at once */
  abstract readonly maxTokens: number;

  /** Name of the embedding model */
  abstract readonly modelName: string;

  /**
   * Generate an embedding for a single text
   * @param text - The text to embed
   * @returns The embedding result with vector and token count
   */
  abstract embed(text: string): Promise<EmbeddingResult>;

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts - Array of texts to embed
   * @returns Batch embedding result with vectors and total token count
   */
  abstract embedBatch(texts: string[]): Promise<BatchEmbeddingResult>;

  /**
   * Embed a text with automatic retry on failure
   * Implements exponential backoff for transient errors
   * @param text - The text to embed
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @returns The embedding result
   */
  async embedWithRetry(text: string, maxRetries: number = 3): Promise<EmbeddingResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.embed(text);
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable (rate limit, timeout, etc.)
        const isRetryable =
          error.status === 429 || // Rate limit
          error.status === 500 || // Server error
          error.status === 503 || // Service unavailable
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNRESET';

        if (!isRetryable || attempt === maxRetries - 1) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Failed to embed text after retries');
  }
}
