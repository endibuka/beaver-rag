/**
 * Fixed-size chunking strategy
 */

import { ChunkingStrategy, Chunk, ChunkOptions } from './base.js';
import { ChunkingError } from '../core/errors.js';

/**
 * Fixed-size chunking strategy
 * Splits text into chunks of approximately equal size with overlap
 */
export class FixedSizeChunking extends ChunkingStrategy {
  constructor(options: ChunkOptions) {
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
  }

  chunk(text: string): Chunk[] {
    if (!text || text.length === 0) {
      return [];
    }

    const chunkContents: string[] = [];
    const { chunkSize, chunkOverlap } = this.options;
    const step = chunkSize - chunkOverlap;

    let startPos = 0;

    while (startPos < text.length) {
      const endPos = Math.min(startPos + chunkSize, text.length);
      const chunkContent = text.slice(startPos, endPos);

      chunkContents.push(chunkContent);
      startPos += step;
    }

    // Convert to Chunk objects with metadata
    return chunkContents.map((content, index) => {
      const startChar = index * step;
      const endChar = Math.min(startChar + content.length, text.length);

      return this.createChunk(content, index, chunkContents.length, startChar, endChar);
    });
  }
}
