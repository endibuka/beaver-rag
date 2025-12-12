/**
 * Custom error classes for the RAG system
 */

/**
 * Base error class for all RAG system errors
 */
export class RAGError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RAGError';
    Object.setPrototypeOf(this, RAGError.prototype);
  }
}

/**
 * Error thrown when embedding generation fails
 */
export class EmbeddingError extends RAGError {
  public readonly tokensUsed?: number;
  public readonly provider?: string;

  constructor(message: string, tokensUsed?: number, provider?: string) {
    super(message);
    this.name = 'EmbeddingError';
    this.tokensUsed = tokensUsed;
    this.provider = provider;
    Object.setPrototypeOf(this, EmbeddingError.prototype);
  }
}

/**
 * Error thrown when database operations fail
 */
export class DatabaseError extends RAGError {
  public readonly query?: string;
  public readonly code?: string;

  constructor(message: string, query?: string, code?: string) {
    super(message);
    this.name = 'DatabaseError';
    this.query = query;
    this.code = code;
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends RAGError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(message: string, field?: string, value?: any) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error thrown when chunking fails
 */
export class ChunkingError extends RAGError {
  constructor(message: string) {
    super(message);
    this.name = 'ChunkingError';
    Object.setPrototypeOf(this, ChunkingError.prototype);
  }
}
