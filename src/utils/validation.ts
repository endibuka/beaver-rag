/**
 * Validation schemas and utilities using Zod
 */

import { z } from 'zod';
import { ValidationError } from '../core/errors.js';

/**
 * Schema for document input
 */
export const DocumentInputSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty').max(100000, 'Content too large'),
  metadata: z.record(z.any()).optional(),
});

/**
 * Schema for search options
 */
export const SearchOptionsSchema = z.object({
  limit: z.number().int().positive().max(1000).optional(),
  minSimilarity: z.number().min(0).max(1).optional(),
  filters: z.record(z.any()).optional(),
});

/**
 * Schema for chunk options
 */
export const ChunkOptionsSchema = z.object({
  chunkSize: z.number().int().positive(),
  chunkOverlap: z.number().int().nonnegative(),
  separators: z.array(z.string()).optional(),
});

/**
 * Validate document input
 * @param data - The data to validate
 * @returns Validated data
 * @throws ValidationError if validation fails
 */
export function validateDocumentInput(data: any): {
  content: string;
  metadata?: Record<string, any>;
} {
  try {
    return DocumentInputSchema.parse(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new ValidationError(
        firstError.message,
        firstError.path.join('.'),
        data[firstError.path[0]]
      );
    }
    throw error;
  }
}

/**
 * Validate search options
 * @param data - The data to validate
 * @returns Validated data
 * @throws ValidationError if validation fails
 */
export function validateSearchOptions(data: any): {
  limit?: number;
  minSimilarity?: number;
  filters?: Record<string, any>;
} {
  try {
    return SearchOptionsSchema.parse(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new ValidationError(
        firstError.message,
        firstError.path.join('.'),
        data[firstError.path[0]]
      );
    }
    throw error;
  }
}

/**
 * Validate chunk options
 * @param data - The data to validate
 * @returns Validated data
 * @throws ValidationError if validation fails
 */
export function validateChunkOptions(data: any): {
  chunkSize: number;
  chunkOverlap: number;
  separators?: string[];
} {
  try {
    return ChunkOptionsSchema.parse(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new ValidationError(
        firstError.message,
        firstError.path.join('.'),
        data[firstError.path[0]]
      );
    }
    throw error;
  }
}

/**
 * Validate that a value is a non-empty string
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @throws ValidationError if validation fails
 */
export function validateNonEmptyString(value: any, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} must be a non-empty string`, fieldName, value);
  }
  return value;
}

/**
 * Validate that a value is a positive number
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @throws ValidationError if validation fails
 */
export function validatePositiveNumber(value: any, fieldName: string): number {
  if (typeof value !== 'number' || value <= 0) {
    throw new ValidationError(`${fieldName} must be a positive number`, fieldName, value);
  }
  return value;
}

/**
 * Validate that a value is an array
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @throws ValidationError if validation fails
 */
export function validateArray(value: any, fieldName: string): any[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`, fieldName, value);
  }
  return value;
}
