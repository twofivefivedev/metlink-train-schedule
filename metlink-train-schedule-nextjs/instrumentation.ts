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
    
    // Initialize Supabase connection if available
    try {
      const { isSupabaseAvailable } = await import('./lib/server/supabaseAdmin');
      const available = await isSupabaseAvailable();
      if (available) {
        console.log('[Instrumentation] Supabase connection available');
      } else {
        console.log('[Instrumentation] Supabase not available, using in-memory cache');
      }
    } catch (error) {
      console.warn('[Instrumentation] Failed to initialize Supabase:', error);
    }
  }
  
  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime initialization
    console.log('[Instrumentation] Edge runtime instrumentation initialized');
  }
}

