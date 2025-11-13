/**
 * Database client singleton
 * Provides Prisma client with connection pooling and error handling
 */

import { logger } from './logger';
import { env } from '@/lib/config/env';

// Lazy load Prisma to avoid errors when DATABASE_URL is not set
let PrismaClient: typeof import('@prisma/client').PrismaClient | null = null;
let prismaInstance: import('@prisma/client').PrismaClient | null = null;

const globalForPrisma = globalThis as unknown as {
  prisma: import('@prisma/client').PrismaClient | undefined;
};

function getPrismaClient() {
  if (!env.DATABASE_URL) {
    return null;
  }

  if (prismaInstance) {
    return prismaInstance;
  }

  try {
    // Lazy import Prisma Client
    if (!PrismaClient) {
      try {
        PrismaClient = require('@prisma/client').PrismaClient;
      } catch (requireError) {
        logger.warn('Prisma Client not generated. Run: npx prisma generate', {
          error: requireError instanceof Error ? requireError.message : String(requireError),
        });
        return null;
      }
    }

    prismaInstance =
      globalForPrisma.prisma ??
      new PrismaClient({
        log: env.LOG_LEVEL === 'DEBUG' ? ['query', 'error', 'warn'] : ['error'],
      });

    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prismaInstance;
    }

    return prismaInstance;
  } catch (error) {
    logger.warn('Failed to initialize Prisma Client', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export const prisma = new Proxy({} as import('@prisma/client').PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    if (!client) {
      throw new Error('Prisma Client is not available. DATABASE_URL is not set.');
    }
    return client[prop as keyof typeof client];
  },
});

/**
 * Check if database is available
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  if (!env.DATABASE_URL) {
    return false;
  }
  
  try {
    const client = getPrismaClient();
    if (!client) {
      return false;
    }
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.warn('Database not available', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Gracefully disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    const client = getPrismaClient();
    if (client) {
      await client.$disconnect();
    }
  } catch (error) {
    logger.error('Error disconnecting from database', error as Error);
  }
}

