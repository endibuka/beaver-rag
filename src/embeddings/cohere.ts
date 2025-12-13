/**
 * Cohere embeddings provider
 */

import { EmbeddingsProvider, EmbeddingResult, BatchEmbeddingResult } from './base.js';
import { EmbeddingError, ValidationError } from '../core/errors.js';

/**
 * Cohere embedding model types
 */
export type CohereEmbeddingModel =
  | 'embed-english-v3.0'
  | 'embed-multilingual-v3.0'
  | 'embed-english-light-v3.0'
  | 'embed-multilingual-light-v3.0';

/**
 * Cohere embeddings provider options
 */
export interface CohereEmbeddingsOptions {
  /** Cohere API key */
  apiKey: string;
  /** Model to use for embeddings (default: 'embed-english-v3.0') */
  model?: CohereEmbeddingModel;
  /** Input type for embeddings */
  inputType?: 'search_document' | 'search_query' | 'classification' | 'clustering';
}

/**
 * Model configurations
 */
const MODEL_CONFIGS = {
  'embed-english-v3.0': {
    dimensions: 1024,
    maxTokens: 512,
  },
  'embed-multilingual-v3.0': {
    dimensions: 1024,
    maxTokens: 512,
  },
  'embed-english-light-v3.0': {
    dimensions: 384,
    maxTokens: 512,
  },
  'embed-multilingual-light-v3.0': {
    dimensions: 384,
    maxTokens: 512,
  },
};

/**
 * Cohere embeddings provider implementation
 */
export class CohereEmbeddings extends EmbeddingsProvider {
  private apiKey: string;
  public readonly modelName: string;
  public readonly dimensions: number;
  public readonly maxTokens: number;
  private readonly inputType: string;

  constructor(options: CohereEmbeddingsOptions) {
    super();

    if (!options.apiKey) {
      throw new ValidationError('Cohere API key is required', 'apiKey');
    }

    this.apiKey = options.apiKey;
    this.modelName = options.model || 'embed-english-v3.0';
    this.inputType = options.inputType || 'search_document';

    const config = MODEL_CONFIGS[this.modelName as CohereEmbeddingModel];

    if (!config) {
      throw new ValidationError(
        `Unsupported model: ${this.modelName}`,
        'model',
        this.modelName
      );
    }

    this.dimensions = config.dimensions;
    this.maxTokens = config.maxTokens;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    if (!text || text.trim().length === 0) {
      throw new ValidationError('Text cannot be empty', 'text', text);
    }

    try {
      const response = await fetch('https://api.cohere.ai/v1/embed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: [text],
          model: this.modelName,
          input_type: this.inputType,
        }),
      });

      if (!response.ok) {
        const error: any = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      const data: any = await response.json();
      const embedding = data.embeddings[0];

      return {
        embedding,
        tokens: text.split(/\s+/).length, // Rough estimate
      };
    } catch (error: any) {
      throw new EmbeddingError(
        `Failed to generate embedding: ${error.message}`,
        undefined,
        'cohere'
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
    }

    // Cohere allows up to 96 texts per request
    const BATCH_SIZE = 96;
    const batches: string[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      batches.push(texts.slice(i, i + BATCH_SIZE));
    }

    try {
      const results = await Promise.all(
        batches.map(async (batch) => {
          const response = await fetch('https://api.cohere.ai/v1/embed', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              texts: batch,
              model: this.modelName,
              input_type: this.inputType,
            }),
          });

          if (!response.ok) {
            const error: any = await response.json();
            throw new Error(error.message || `HTTP ${response.status}`);
          }

          const data: any = await response.json();

          return {
            embeddings: data.embeddings,
            tokens: batch.reduce((sum, text) => sum + text.split(/\s+/).length, 0),
          };
        })
      );

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
        'cohere'
      );
    }
  }
}
