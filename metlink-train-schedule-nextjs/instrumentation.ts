/**
 * Next.js instrumentation hook
 * Runs once when the server starts
 * Used for performance monitoring and initialization
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side initialization
    // This is where we can set up performance monitoring, database connections, etc.
    
    // Log that instrumentation is running
    console.log('[Instrumentation] Server-side instrumentation initialized');
    
    // Initialize database connection if available
    try {
      const { prisma, isDatabaseAvailable } = await import('./lib/server/db');
      const available = await isDatabaseAvailable();
      if (available) {
        console.log('[Instrumentation] Database connection available');
      } else {
        console.log('[Instrumentation] Database not available, using in-memory cache');
      }
    } catch (error) {
      console.warn('[Instrumentation] Failed to initialize database:', error);
    }
  }
  
  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime initialization
    console.log('[Instrumentation] Edge runtime instrumentation initialized');
  }
}

