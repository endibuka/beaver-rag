/**
 * Base classes and interfaces for text chunking strategies
 */

/**
 * Configuration options for chunking
 */
export interface ChunkOptions {
  /** Size of each chunk (in tokens or characters depending on implementation) */
  chunkSize: number;
  /** Overlap between consecutive chunks (in tokens or characters) */
  chunkOverlap: number;
  /** Optional separators for splitting text (for recursive chunking) */
  separators?: string[];
}

/**
 * A single chunk of text with metadata
 */
export interface Chunk {
  /** The text content of the chunk */
  content: string;
  /** Metadata about the chunk */
  metadata: {
    /** Index of this chunk in the sequence */
    chunkIndex: number;
    /** Total number of chunks from the source document */
    totalChunks: number;
    /** Starting character position in the original text (optional) */
    startChar?: number;
    /** Ending character position in the original text (optional) */
    endChar?: number;
  };
}

/**
 * Abstract base class for chunking strategies
 * Extend this class to implement custom chunking algorithms
 */
export abstract class ChunkingStrategy {
  protected options: ChunkOptions;

  constructor(options: ChunkOptions) {
    this.options = options;
  }

  /**
   * Split a text into chunks
   * @param text - The text to chunk
   * @returns Array of chunks with metadata
   */
  abstract chunk(text: string): Chunk[];

  /**
   * Split multiple texts into chunks in batch
   * @param texts - Array of texts to chunk
   * @returns Array of chunk arrays (one per input text)
   */
  chunkBatch(texts: string[]): Chunk[][] {
    return texts.map((text) => this.chunk(text));
  }

  /**
   * Helper method to create a chunk with proper metadata
   * @param content - The chunk content
   * @param index - Index of this chunk
   * @param total - Total number of chunks
   * @param startChar - Starting character position (optional)
   * @param endChar - Ending character position (optional)
   * @returns A properly formatted chunk
   */
  protected createChunk(
    content: string,
    index: number,
    total: number,
    startChar?: number,
    endChar?: number
  ): Chunk {
    return {
      content,
      metadata: {
        chunkIndex: index,
        totalChunks: total,
        startChar,
        endChar,
      },
    };
  }
}
