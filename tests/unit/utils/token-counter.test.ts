import { describe, test, expect } from 'bun:test';
import { countTokens, countTokensBatch, countTotalTokens, validateTokenLimit } from '../../../src/utils/token-counter.js';
import { ValidationError } from '../../../src/core/errors.js';

describe('Token Counter', () => {
  test('should count tokens for simple text', () => {
    const text = 'Hello, world!';
    const tokens = countTokens(text);

    expect(tokens).toBeGreaterThan(0);
    expect(typeof tokens).toBe('number');
  });

  test('should return 0 for empty text', () => {
    expect(countTokens('')).toBe(0);
  });

  test('should count tokens for different models', () => {
    const text = 'This is a test sentence.';

    const tokensSmall = countTokens(text, 'text-embedding-3-small');
    const tokensAda = countTokens(text, 'text-embedding-ada-002');

    expect(tokensSmall).toBeGreaterThan(0);
    expect(tokensAda).toBeGreaterThan(0);
  });

  test('should count tokens in batch', () => {
    const texts = [
      'First text',
      'Second text',
      'Third text',
    ];

    const tokenCounts = countTokensBatch(texts);

    expect(tokenCounts).toHaveLength(3);
    tokenCounts.forEach((count) => {
      expect(count).toBeGreaterThan(0);
    });
  });

  test('should count total tokens', () => {
    const texts = [
      'Hello',
      'World',
    ];

    const total = countTotalTokens(texts);

    expect(total).toBeGreaterThan(0);
    expect(total).toBe(countTokens(texts[0]) + countTokens(texts[1]));
  });

  test('should validate token limit successfully', () => {
    const text = 'Short text';
    const maxTokens = 100;

    expect(() => {
      validateTokenLimit(text, maxTokens);
    }).not.toThrow();
  });

  test('should throw error when exceeding token limit', () => {
    const text = 'word '.repeat(10000); // Very long text
    const maxTokens = 10;

    expect(() => {
      validateTokenLimit(text, maxTokens);
    }).toThrow(ValidationError);
  });

  test('should handle special characters', () => {
    const text = '你好世界'; // Chinese characters
    const tokens = countTokens(text);

    expect(tokens).toBeGreaterThan(0);
  });

  test('should handle code snippets', () => {
    const code = `
      function hello() {
        console.log("Hello, world!");
      }
    `;

    const tokens = countTokens(code);

    expect(tokens).toBeGreaterThan(0);
  });
});
