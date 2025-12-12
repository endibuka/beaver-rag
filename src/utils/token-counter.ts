/**
 * Token counting utilities using tiktoken
 */

import { encoding_for_model } from 'tiktoken';
import { ValidationError } from '../core/errors.js';

/**
 * Supported OpenAI models for token counting
 */
export type TokenCounterModel =
  | 'text-embedding-ada-002'
  | 'text-embedding-3-small'
  | 'text-embedding-3-large'
  | 'gpt-3.5-turbo'
  | 'gpt-4';

/**
 * Count tokens in a text for a specific model
 * @param text - The text to count tokens for
 * @param model - The model to use for encoding (default: 'text-embedding-3-small')
 * @returns Number of tokens
 */
export function countTokens(
  text: string,
  model: TokenCounterModel = 'text-embedding-3-small'
): number {
  if (!text) {
    return 0;
  }

  try {
    const encoding = encoding_for_model(model as any);
    const tokens = encoding.encode(text);
    const count = tokens.length;
    encoding.free();
    return count;
  } catch (error: any) {
    throw new ValidationError(
      `Failed to count tokens: ${error.message}`,
      'text',
      text
    );
  }
}

/**
 * Count tokens for multiple texts
 * @param texts - Array of texts to count tokens for
 * @param model - The model to use for encoding
 * @returns Array of token counts
 */
export function countTokensBatch(
  texts: string[],
  model: TokenCounterModel = 'text-embedding-3-small'
): number[] {
  return texts.map((text) => countTokens(text, model));
}

/**
 * Count total tokens for multiple texts
 * @param texts - Array of texts to count tokens for
 * @param model - The model to use for encoding
 * @returns Total number of tokens
 */
export function countTotalTokens(
  texts: string[],
  model: TokenCounterModel = 'text-embedding-3-small'
): number {
  return texts.reduce((sum, text) => sum + countTokens(text, model), 0);
}

/**
 * Validate that text doesn't exceed token limit
 * @param text - The text to validate
 * @param maxTokens - Maximum allowed tokens
 * @param model - The model to use for encoding
 * @throws ValidationError if text exceeds token limit
 */
export function validateTokenLimit(
  text: string,
  maxTokens: number,
  model: TokenCounterModel = 'text-embedding-3-small'
): void {
  const tokens = countTokens(text, model);

  if (tokens > maxTokens) {
    throw new ValidationError(
      `Text exceeds token limit: ${tokens} > ${maxTokens}`,
      'text',
      tokens
    );
  }
}
