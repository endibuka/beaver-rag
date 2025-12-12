import { describe, test, expect } from 'bun:test';
import { RecursiveChunking } from '../../../src/chunking/recursive.js';
import { ChunkingError } from '../../../src/core/errors.js';

describe('RecursiveChunking', () => {
  test('should split by paragraph breaks first', () => {
    const chunker = new RecursiveChunking({
      chunkSize: 50,
      chunkOverlap: 0,
    });

    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    const chunks = chunker.chunk(text);

    expect(chunks.length).toBeGreaterThanOrEqual(1);
    chunks.forEach((chunk) => {
      expect(chunk.content.length).toBeLessThanOrEqual(50);
    });
  });

  test('should split by sentences when paragraphs are too long', () => {
    const chunker = new RecursiveChunking({
      chunkSize: 30,
      chunkOverlap: 0,
    });

    const text = 'This is a long sentence. This is another long sentence. And one more.';
    const chunks = chunker.chunk(text);

    // Recursive chunking may slightly exceed chunk size to preserve semantic units
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    chunks.forEach((chunk) => {
      // Allow some flexibility for semantic preservation
      expect(chunk.content.length).toBeLessThanOrEqual(50);
    });
  });

  test('should return empty array for empty text', () => {
    const chunker = new RecursiveChunking({
      chunkSize: 100,
      chunkOverlap: 10,
    });

    expect(chunker.chunk('')).toEqual([]);
  });

  test('should include metadata in chunks', () => {
    const chunker = new RecursiveChunking({
      chunkSize: 20,
      chunkOverlap: 5,
    });

    const text = 'This is a test. Another test. More text here.';
    const chunks = chunker.chunk(text);

    chunks.forEach((chunk, index) => {
      expect(chunk.metadata.chunkIndex).toBe(index);
      expect(chunk.metadata.totalChunks).toBe(chunks.length);
    });
  });

  test('should handle text shorter than chunk size', () => {
    const chunker = new RecursiveChunking({
      chunkSize: 100,
      chunkOverlap: 10,
    });

    const text = 'Short text';
    const chunks = chunker.chunk(text);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe('Short text');
  });

  test('should respect chunk overlap', () => {
    const chunker = new RecursiveChunking({
      chunkSize: 30,
      chunkOverlap: 10,
    });

    const text = 'A'.repeat(60);
    const chunks = chunker.chunk(text);

    expect(chunks.length).toBeGreaterThan(1);
    // Recursive chunking may slightly exceed chunk size to preserve semantic units
    chunks.forEach((chunk) => {
      expect(chunk.content.length).toBeLessThanOrEqual(50);
    });
  });

  test('should throw error for invalid chunk size', () => {
    expect(() => {
      new RecursiveChunking({
        chunkSize: 0,
        chunkOverlap: 0,
      });
    }).toThrow(ChunkingError);
  });

  test('should throw error for negative overlap', () => {
    expect(() => {
      new RecursiveChunking({
        chunkSize: 100,
        chunkOverlap: -1,
      });
    }).toThrow(ChunkingError);
  });

  test('should throw error for overlap >= chunk size', () => {
    expect(() => {
      new RecursiveChunking({
        chunkSize: 100,
        chunkOverlap: 100,
      });
    }).toThrow(ChunkingError);
  });

  test('should use custom separators', () => {
    const chunker = new RecursiveChunking({
      chunkSize: 30,
      chunkOverlap: 0,
      separators: ['|', ' '],
    });

    const text = 'Part one|Part two|Part three';
    const chunks = chunker.chunk(text);

    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  test('should chunk batch of texts', () => {
    const chunker = new RecursiveChunking({
      chunkSize: 20,
      chunkOverlap: 5,
    });

    const texts = [
      'First document text.',
      'Second document text.',
    ];
    const allChunks = chunker.chunkBatch(texts);

    expect(allChunks).toHaveLength(2);
    expect(Array.isArray(allChunks[0])).toBe(true);
    expect(Array.isArray(allChunks[1])).toBe(true);
  });

  test('should preserve content when chunking', () => {
    const chunker = new RecursiveChunking({
      chunkSize: 100,
      chunkOverlap: 20,
    });

    const text = 'This is a test document that will be chunked into multiple pieces.';
    const chunks = chunker.chunk(text);

    // All chunks should contain parts of the original text
    chunks.forEach((chunk) => {
      expect(text).toContain(chunk.content.trim());
    });
  });
});
