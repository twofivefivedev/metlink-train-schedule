/**
 * Base repository utilities
 * Shared patterns for Supabase repository implementations
 */

import { getSupabaseAdminClient } from '../supabaseAdmin';
import { logger } from '../logger';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/supabase/types';

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  hasMore: boolean;
}

/**
 * Base repository error
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/**
 * Check if error is a "not found" error (PGRST116)
 */
export function isNotFoundError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    return error.code === 'PGRST116';
  }
  return false;
}

/**
 * Check if error is a duplicate key error
 */
export function isDuplicateKeyError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string') {
      return error.message.includes('duplicate') || error.message.includes('unique');
    }
    if ('code' in error && typeof error.code === 'string') {
      return error.code.includes('23505'); // PostgreSQL unique violation
    }
  }
  return false;
}

/**
 * Handle repository error with logging
 */
export function handleRepositoryError(
  operation: string,
  error: unknown,
  context?: Record<string, unknown>
): never {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = error && typeof error === 'object' && 'code' in error 
    ? String(error.code) 
    : undefined;

  logger.error(`Repository operation failed: ${operation}`, {
    error: errorMessage,
    code: errorCode,
    ...context,
  });

  throw new RepositoryError(
    `Failed to ${operation}: ${errorMessage}`,
    errorCode,
    error
  );
}

/**
 * Safe JSON serialization for Supabase
 * Validates that data is JSON-serializable before casting to Json type
 */
export function toJson<T>(data: T): Json {
  // Supabase Json type accepts any JSON-compatible value
  // This is a type-safe wrapper that ensures runtime validation
  try {
    JSON.stringify(data);
    return data as unknown as Json;
  } catch (error) {
    throw new RepositoryError(
      'Data is not JSON-serializable',
      'INVALID_JSON',
      error
    );
  }
}

/**
 * Safe JSON deserialization from Supabase
 * Type-safe extraction of JSON data
 */
export function fromJson<T>(json: Json): T {
  // Type assertion is safe here as we're reading from Supabase
  // which stores valid JSON. Runtime validation should happen at the schema level.
  return json as unknown as T;
}

/**
 * Get Supabase client (shared utility)
 */
export function getSupabaseClient(): ReturnType<typeof getSupabaseAdminClient> {
  return getSupabaseAdminClient();
}

/**
 * Apply pagination to a Supabase query
 */
export function applyPagination<T>(
  query: any,
  options?: PaginationOptions
): any {
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset !== undefined) {
    query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
  } else if (options?.page !== undefined && options?.pageSize) {
    const offset = options.page * options.pageSize;
    query = query.range(offset, offset + options.pageSize - 1);
  }
  return query;
}

/**
 * Create paginated result
 */
export function createPaginatedResult<T>(
  data: T[],
  options?: PaginationOptions
): PaginatedResult<T> {
  const page = options?.page ?? 0;
  const pageSize = options?.pageSize ?? data.length;
  
  return {
    data,
    page,
    pageSize,
    hasMore: options?.limit ? data.length >= (options.limit) : false,
  };
}

/**
 * Execute repository operation with error handling
 */
export async function executeWithErrorHandling<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isNotFoundError(error)) {
      // Return null for not found errors (caller can handle)
      return null as T;
    }
    handleRepositoryError(operation, error, context);
  }
}

