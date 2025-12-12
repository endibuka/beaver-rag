import { describe, test, expect } from 'bun:test';
import { FixedSizeChunking } from '../../../src/chunking/fixed-size.js';
import { ChunkingError } from '../../../src/core/errors.js';

describe('FixedSizeChunking', () => {
  test('should chunk text into specified size', () => {
    const chunker = new FixedSizeChunking({
      chunkSize: 10,
      chunkOverlap: 0,
    });

    const text = 'a'.repeat(25);
    const chunks = chunker.chunk(text);

    expect(chunks).toHaveLength(3);
    expect(chunks[0].content).toHaveLength(10);
    expect(chunks[1].content).toHaveLength(10);
    expect(chunks[2].content).toHaveLength(5);
  });

  test('should handle overlap correctly', () => {
    const chunker = new FixedSizeChunking({
      chunkSize: 10,
      chunkOverlap: 2,
    });

    const text = '0123456789012345'; // 16 chars
    const chunks = chunker.chunk(text);

    // With size 10 and overlap 2, step = 8
    // Chunk 0: 0-10, Chunk 1: 8-16
    expect(chunks).toHaveLength(2);
    expect(chunks[0].content).toBe('0123456789');
    expect(chunks[1].content).toBe('89012345');
  });

  test('should return empty array for empty text', () => {
    const chunker = new FixedSizeChunking({
      chunkSize: 10,
      chunkOverlap: 0,
    });

    expect(chunker.chunk('')).toEqual([]);
  });

  test('should include metadata in chunks', () => {
    const chunker = new FixedSizeChunking({
      chunkSize: 5,
      chunkOverlap: 0,
    });

    const text = '0123456789';
    const chunks = chunker.chunk(text);

    expect(chunks[0].metadata.chunkIndex).toBe(0);
    expect(chunks[0].metadata.totalChunks).toBe(2);
    expect(chunks[1].metadata.chunkIndex).toBe(1);
    expect(chunks[1].metadata.totalChunks).toBe(2);
  });

  test('should throw error for invalid chunk size', () => {
    expect(() => {
      new FixedSizeChunking({
        chunkSize: 0,
        chunkOverlap: 0,
      });
    }).toThrow(ChunkingError);

    expect(() => {
      new FixedSizeChunking({
        chunkSize: -1,
        chunkOverlap: 0,
      });
    }).toThrow(ChunkingError);
  });

  test('should throw error for negative overlap', () => {
    expect(() => {
      new FixedSizeChunking({
        chunkSize: 10,
        chunkOverlap: -1,
      });
    }).toThrow(ChunkingError);
  });

  test('should throw error for overlap >= chunk size', () => {
    expect(() => {
      new FixedSizeChunking({
        chunkSize: 10,
        chunkOverlap: 10,
      });
    }).toThrow(ChunkingError);
  });

  test('should handle text shorter than chunk size', () => {
    const chunker = new FixedSizeChunking({
      chunkSize: 100,
      chunkOverlap: 10,
    });

    const text = 'Short text';
    const chunks = chunker.chunk(text);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe('Short text');
  });

  test('should chunk batch of texts', () => {
    const chunker = new FixedSizeChunking({
      chunkSize: 5,
      chunkOverlap: 0,
    });

    const texts = ['0123456789', 'abcdefgh'];
    const allChunks = chunker.chunkBatch(texts);

    expect(allChunks).toHaveLength(2);
    expect(allChunks[0]).toHaveLength(2); // First text has 2 chunks
    expect(allChunks[1]).toHaveLength(2); // Second text has 2 chunks
  });
});
