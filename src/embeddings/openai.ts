/**
 * OpenAI embeddings provider
 */

import OpenAI from 'openai';
import { EmbeddingsProvider, EmbeddingResult, BatchEmbeddingResult } from './base.js';
import { EmbeddingError, ValidationError } from '../core/errors.js';
import { countTokens, validateTokenLimit } from '../utils/token-counter.js';

/**
 * OpenAI embedding model types
 */
export type OpenAIEmbeddingModel =
  | 'text-embedding-3-small'
  | 'text-embedding-3-large'
  | 'text-embedding-ada-002';

/**
 * OpenAI embeddings provider options
 */
export interface OpenAIEmbeddingsOptions {
  /** OpenAI API key */
  apiKey: string;
  /** Model to use for embeddings (default: 'text-embedding-3-small') */
  model?: OpenAIEmbeddingModel;
  /** Number of dimensions (only for text-embedding-3-* models) */
  dimensions?: number;
  /** Organization ID (optional) */
  organization?: string;
  /** Base URL for API (optional, for custom endpoints) */
  baseURL?: string;
}

/**
 * Model configurations
 */
const MODEL_CONFIGS = {
  'text-embedding-3-small': {
    defaultDimensions: 1536,
    maxTokens: 8191,
    supportsDimensions: true,
  },
  'text-embedding-3-large': {
    defaultDimensions: 3072,
    maxTokens: 8191,
    supportsDimensions: true,
  },
  'text-embedding-ada-002': {
    defaultDimensions: 1536,
    maxTokens: 8191,
    supportsDimensions: false,
  },
};

/**
 * OpenAI embeddings provider implementation
 */
export class OpenAIEmbeddings extends EmbeddingsProvider {
  private client: OpenAI;
  public readonly modelName: string;
  public readonly dimensions: number;
  public readonly maxTokens: number;
  private readonly supportsDimensions: boolean;

  constructor(options: OpenAIEmbeddingsOptions) {
    super();

    if (!options.apiKey) {
      throw new ValidationError('OpenAI API key is required', 'apiKey');
    }

    this.modelName = options.model || 'text-embedding-3-small';
    const config = MODEL_CONFIGS[this.modelName as OpenAIEmbeddingModel];

    if (!config) {
      throw new ValidationError(
        `Unsupported model: ${this.modelName}`,
        'model',
        this.modelName
      );
    }

    this.dimensions = options.dimensions || config.defaultDimensions;
    this.maxTokens = config.maxTokens;
    this.supportsDimensions = config.supportsDimensions;

    // Validate dimensions for models that support it
    if (
      options.dimensions &&
      !this.supportsDimensions &&
      options.dimensions !== config.defaultDimensions
    ) {
      throw new ValidationError(
        `Model ${this.modelName} does not support custom dimensions`,
        'dimensions',
        options.dimensions
      );
    }

    this.client = new OpenAI({
      apiKey: options.apiKey,
      organization: options.organization,
      baseURL: options.baseURL,
    });
  }

  async embed(text: string): Promise<EmbeddingResult> {
    if (!text || text.trim().length === 0) {
      throw new ValidationError('Text cannot be empty', 'text', text);
    }

    // Validate token limit
    validateTokenLimit(text, this.maxTokens, this.modelName as any);

    try {
      const requestParams: any = {
        model: this.modelName,
        input: text,
      };

      // Add dimensions parameter for models that support it
      if (this.supportsDimensions) {
        requestParams.dimensions = this.dimensions;
      }

      const response = await this.client.embeddings.create(requestParams);

      const embedding = response.data[0].embedding;
      const tokens = response.usage.total_tokens;

      return {
        embedding,
        tokens,
      };
    } catch (error: any) {
      throw new EmbeddingError(
        `Failed to generate embedding: ${error.message}`,
        undefined,
        'openai'
      );
    }
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    if (texts.length === 0) {
      return {
        embeddings: [],
        totalTokens: 0,
      };
    }

    // Validate all texts
    for (const text of texts) {
      if (!text || text.trim().length === 0) {
        throw new ValidationError('All texts must be non-empty', 'texts');
      }
      validateTokenLimit(text, this.maxTokens, this.modelName as any);
    }

    // OpenAI allows up to 2048 texts per request, but we'll batch at 100 for safety
    const BATCH_SIZE = 100;
    const batches: string[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      batches.push(texts.slice(i, i + BATCH_SIZE));
    }

    try {
      const results = await Promise.all(
        batches.map(async (batch) => {
          const requestParams: any = {
            model: this.modelName,
            input: batch,
          };

          if (this.supportsDimensions) {
            requestParams.dimensions = this.dimensions;
          }

          const response = await this.client.embeddings.create(requestParams);

          return {
            embeddings: response.data.map((item) => item.embedding),
            tokens: response.usage.total_tokens,
          };
        })
      );

      // Combine results from all batches
      const embeddings = results.flatMap((result) => result.embeddings);
      const totalTokens = results.reduce((sum, result) => sum + result.tokens, 0);

      return {
        embeddings,
        totalTokens,
      };
    } catch (error: any) {
      throw new EmbeddingError(
        `Failed to generate batch embeddings: ${error.message}`,
        undefined,
        'openai'
      );
    }
  }

  /**
   * Get cost estimate for embedding text(s)
   * @param tokenCount - Number of tokens
   * @returns Estimated cost in USD
   */
  estimateCost(tokenCount: number): number {
    // Pricing as of 2024 (may change)
    const PRICE_PER_1M_TOKENS = {
      'text-embedding-3-small': 0.02,
      'text-embedding-3-large': 0.13,
      'text-embedding-ada-002': 0.10,
    };

    const pricePerToken =
      PRICE_PER_1M_TOKENS[this.modelName as OpenAIEmbeddingModel] / 1_000_000;

    return tokenCount * pricePerToken;
  }

  /**
   * Count tokens in text without making API call
   * @param text - The text to count tokens for
   * @returns Number of tokens
   */
  countTokens(text: string): number {
    return countTokens(text, this.modelName as any);
  }
}
