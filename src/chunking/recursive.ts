/**
 * Recursive text splitting strategy
 */

import { ChunkingStrategy, Chunk, ChunkOptions } from './base.js';
import { ChunkingError } from '../core/errors.js';

/**
 * Options for recursive chunking
 */
export interface RecursiveChunkOptions extends ChunkOptions {
  /** Separators to use for splitting (in order of preference) */
  separators?: string[];
}

/**
 * Default separators for recursive text splitting
 * Prioritizes larger semantic units (paragraphs) over smaller ones (words)
 */
const DEFAULT_SEPARATORS = [
  '\n\n', // Paragraph breaks
  '\n', // Line breaks
  '. ', // Sentences
  '? ', // Questions
  '! ', // Exclamations
  '; ', // Semicolons
  ', ', // Commas
  ' ', // Spaces
  '', // Characters (fallback)
];

/**
 * Recursive text splitting strategy
 * Splits text while trying to preserve semantic meaning by using a hierarchy of separators
 */
export class RecursiveChunking extends ChunkingStrategy {
  private separators: string[];

  constructor(options: RecursiveChunkOptions) {
    super(options);

    if (options.chunkSize <= 0) {
      throw new ChunkingError('Chunk size must be greater than 0');
    }

    if (options.chunkOverlap < 0) {
      throw new ChunkingError('Chunk overlap cannot be negative');
    }

    if (options.chunkOverlap >= options.chunkSize) {
      throw new ChunkingError('Chunk overlap must be less than chunk size');
    }

    this.separators = options.separators || DEFAULT_SEPARATORS;
  }

  chunk(text: string): Chunk[] {
    if (!text || text.length === 0) {
      return [];
    }

    const splits = this.splitText(text, this.options.chunkSize);

    // Merge splits to create chunks with overlap
    const chunks = this.mergeChunks(splits, this.options.chunkSize, this.options.chunkOverlap);

    // Convert to Chunk objects with metadata
    return chunks.map((content, index) =>
      this.createChunk(content, index, chunks.length)
    );
  }

  /**
   * Recursively split text using separators
   * @param text - The text to split
   * @param chunkSize - Maximum size of each chunk
   * @returns Array of text splits
   */
  private splitText(text: string, chunkSize: number): string[] {
    if (text.length <= chunkSize) {
      return [text];
    }

    // Try each separator in order
    for (const separator of this.separators) {
      if (separator === '') {
        // Fallback: split by characters
        return this.splitBySize(text, chunkSize);
      }

      if (text.includes(separator)) {
        const parts = text.split(separator);
        const splits: string[] = [];
        let currentChunk = '';

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const partWithSep = i < parts.length - 1 ? part + separator : part;

          if (currentChunk.length === 0) {
            currentChunk = partWithSep;
          } else if (currentChunk.length + partWithSep.length <= chunkSize) {
            currentChunk += partWithSep;
          } else {
            // Current chunk is full
            if (currentChunk.length > 0) {
              splits.push(currentChunk);
            }

            // If the part itself is too large, recursively split it
            if (partWithSep.length > chunkSize) {
              const subSplits = this.splitText(partWithSep, chunkSize);
              splits.push(...subSplits);
              currentChunk = '';
            } else {
              currentChunk = partWithSep;
            }
          }
        }

        if (currentChunk.length > 0) {
          splits.push(currentChunk);
        }

        return splits;
      }
    }

    // Fallback: split by size
    return this.splitBySize(text, chunkSize);
  }

  /**
   * Split text by character size (fallback method)
   * @param text - The text to split
   * @param size - Maximum size of each chunk
   * @returns Array of text chunks
   */
  private splitBySize(text: string, size: number): string[] {
    const chunks: string[] = [];

    for (let i = 0; i < text.length; i += size) {
      chunks.push(text.slice(i, i + size));
    }

    return chunks;
  }

  /**
   * Merge splits into chunks with overlap
   * @param splits - Array of text splits
   * @param chunkSize - Maximum size of each chunk
   * @param overlap - Size of overlap between chunks
   * @returns Array of chunks with overlap
   */
  private mergeChunks(splits: string[], chunkSize: number, overlap: number): string[] {
    if (overlap === 0) {
      return splits;
    }

    const chunks: string[] = [];
    let currentChunk = '';

    for (const split of splits) {
      if (currentChunk.length === 0) {
        currentChunk = split;
      } else if (currentChunk.length + split.length <= chunkSize) {
        currentChunk += split;
      } else {
        chunks.push(currentChunk);

        // Create overlap by taking the last `overlap` characters
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = overlapText + split;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }
}
