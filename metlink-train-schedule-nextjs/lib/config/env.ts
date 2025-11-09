/**
 * Environment configuration with validation
 * Centralized location for all environment variables
 */

import { z } from 'zod';

/**
 * Environment variable schema
 */
const envSchema = z.object({
  // Metlink API Configuration
  METLINK_API_KEY: z.string().min(1, 'METLINK_API_KEY is required'),
  METLINK_API_BASE: z.string().url().default('https://api.opendata.metlink.org.nz/v1'),
  
  // Public API Base URL (for frontend)
  NEXT_PUBLIC_API_BASE: z.string().default(''),
  
  // API Configuration
  API_TIMEOUT_MS: z.string().regex(/^\d+$/).transform(Number).default('10000'),
  
  // Cache Configuration
  CACHE_DURATION_MS: z.string().regex(/^\d+$/).transform(Number).optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).default('INFO'),
  
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Validated environment variables
 */
function getEnv() {
  // Server-side: use process.env directly
  // Client-side: only NEXT_PUBLIC_* vars are available
  
  if (typeof window === 'undefined') {
    // Server-side validation
    const serverEnv = {
      METLINK_API_KEY: process.env.METLINK_API_KEY,
      METLINK_API_BASE: process.env.METLINK_API_BASE || 'https://api.opendata.metlink.org.nz/v1',
      NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || '',
      API_TIMEOUT_MS: process.env.API_TIMEOUT_MS || '10000',
      CACHE_DURATION_MS: process.env.CACHE_DURATION_MS,
      LOG_LEVEL: process.env.LOG_LEVEL || 'INFO',
      NODE_ENV: process.env.NODE_ENV || 'development',
    };
    
    try {
      return envSchema.parse(serverEnv);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Environment validation failed:', error.errors);
        throw new Error(`Invalid environment configuration: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
      }
      throw error;
    }
  } else {
    // Client-side: only validate public vars
    const clientEnv = {
      NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || '',
    };
    
    return {
      ...clientEnv,
      // Provide defaults for server-only vars (won't be used client-side)
      METLINK_API_KEY: '',
      METLINK_API_BASE: 'https://api.opendata.metlink.org.nz/v1',
      API_TIMEOUT_MS: 10000,
      CACHE_DURATION_MS: undefined,
      LOG_LEVEL: 'INFO' as const,
      NODE_ENV: 'development' as const,
    };
  }
}

export const env = getEnv();

/**
 * Get API base URL for client-side requests
 */
export function getApiBaseUrl(): string {
  return env.NEXT_PUBLIC_API_BASE || '';
}

/**
 * Get Metlink API base URL (server-side only)
 */
export function getMetlinkApiBase(): string {
  if (typeof window !== 'undefined') {
    throw new Error('getMetlinkApiBase() can only be called server-side');
  }
  return env.METLINK_API_BASE;
}

