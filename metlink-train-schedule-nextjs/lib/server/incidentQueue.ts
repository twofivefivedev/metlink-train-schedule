/**
 * Incident Queue Service
 * Background queue for recording service incidents with batching, retries, and circuit breaker
 */

import { logger } from './logger';
import { getIncidentsRepository, type ServiceIncidentRecord } from './db';
import { isSupabaseAvailable } from './supabaseAdmin';

interface QueuedIncident {
  incident: ServiceIncidentRecord;
  attempts: number;
  queuedAt: number;
}

interface QueueConfig {
  batchSize: number;
  batchIntervalMs: number;
  maxRetries: number;
  retryDelayMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerResetMs: number;
}

class IncidentQueue {
  private queue: QueuedIncident[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;
  private circuitBreakerOpen: boolean = false;
  private circuitBreakerFailures: number = 0;
  private circuitBreakerLastFailure: number = 0;
  private config: QueueConfig;

  constructor(config?: Partial<QueueConfig>) {
    this.config = {
      batchSize: config?.batchSize ?? 50,
      batchIntervalMs: config?.batchIntervalMs ?? 5000, // 5 seconds
      maxRetries: config?.maxRetries ?? 3,
      retryDelayMs: config?.retryDelayMs ?? 1000,
      circuitBreakerThreshold: config?.circuitBreakerThreshold ?? 5,
      circuitBreakerResetMs: config?.circuitBreakerResetMs ?? 60000, // 1 minute
      ...config,
    };
  }

  /**
   * Add incidents to the queue for background processing
   */
  async enqueue(incidents: ServiceIncidentRecord[]): Promise<void> {
    if (incidents.length === 0) {
      return;
    }

    // Check circuit breaker
    if (this.circuitBreakerOpen) {
      const timeSinceLastFailure = Date.now() - this.circuitBreakerLastFailure;
      if (timeSinceLastFailure > this.config.circuitBreakerResetMs) {
        logger.info('Circuit breaker reset, attempting to process incidents');
        this.circuitBreakerOpen = false;
        this.circuitBreakerFailures = 0;
      } else {
        logger.debug('Circuit breaker open, skipping incident recording', {
          queueSize: this.queue.length,
          incidentsSkipped: incidents.length,
        });
        return;
      }
    }

    // Add to queue
    const now = Date.now();
    for (const incident of incidents) {
      this.queue.push({
        incident,
        attempts: 0,
        queuedAt: now,
      });
    }

    logger.debug('Incidents queued', {
      count: incidents.length,
      queueSize: this.queue.length,
    });

    // Start processing if not already running
    this.scheduleProcessing();
  }

  /**
   * Schedule batch processing
   */
  private scheduleProcessing(): void {
    if (this.batchTimer || this.isProcessing) {
      return;
    }

    // Process immediately if batch size reached
    if (this.queue.length >= this.config.batchSize) {
      this.processBatch();
      return;
    }

    // Otherwise schedule for batch interval
    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      this.processBatch();
    }, this.config.batchIntervalMs);
  }

  /**
   * Process a batch of incidents
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Check if Supabase is available
      if (!(await isSupabaseAvailable())) {
        logger.debug('Supabase not available, keeping incidents in queue');
        this.isProcessing = false;
        this.scheduleProcessing();
        return;
      }

      // Take up to batchSize incidents
      const batch: QueuedIncident[] = [];
      while (batch.length < this.config.batchSize && this.queue.length > 0) {
        const item = this.queue.shift();
        if (item) {
          batch.push(item);
        }
      }

      if (batch.length === 0) {
        this.isProcessing = false;
        return;
      }

      // Extract incidents
      const incidents = batch.map((item) => item.incident);

      // Try to insert
      try {
        const incidentsRepo = getIncidentsRepository();
        await incidentsRepo.insert(incidents);

        // Success - reset circuit breaker
        this.circuitBreakerFailures = 0;
        this.circuitBreakerOpen = false;

        logger.info('Incidents batch processed successfully', {
          count: incidents.length,
          queueSize: this.queue.length,
          byType: {
            cancelled: incidents.filter((i) => i.incidentType === 'cancelled').length,
            delayed: incidents.filter((i) => i.incidentType === 'delayed').length,
            bus_replacement: incidents.filter((i) => i.incidentType === 'bus_replacement').length,
          },
        });
      } catch (error) {
        // Handle errors
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check if it's a duplicate error (acceptable)
        if (
          errorMessage.includes('duplicate') ||
          errorMessage.includes('unique') ||
          errorMessage.includes('23505')
        ) {
          logger.debug('Duplicate incidents detected (expected)', {
            count: incidents.length,
          });
          // Don't retry duplicates
        } else {
          // Real error - retry logic
          logger.warn('Failed to process incidents batch', {
            error: errorMessage,
            count: incidents.length,
          });

          // Increment circuit breaker failures
          this.circuitBreakerFailures++;
          this.circuitBreakerLastFailure = Date.now();

          if (this.circuitBreakerFailures >= this.config.circuitBreakerThreshold) {
            this.circuitBreakerOpen = true;
            logger.error('Circuit breaker opened due to repeated failures', {
              failures: this.circuitBreakerFailures,
              threshold: this.config.circuitBreakerThreshold,
              queueSize: this.queue.length,
            });
          }

          // Retry items that haven't exceeded max retries
          for (const item of batch) {
            item.attempts++;
            if (item.attempts < this.config.maxRetries) {
              // Add back to queue with delay
              setTimeout(() => {
                this.queue.push(item);
                this.scheduleProcessing();
              }, this.config.retryDelayMs * item.attempts); // Exponential backoff
            } else {
              logger.error('Incident exceeded max retries, dropping', {
                serviceId: item.incident.serviceId,
                incidentType: item.incident.incidentType,
                attempts: item.attempts,
              });
            }
          }
        }
      }
    } catch (error) {
      logger.error('Unexpected error in incident queue processing', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.isProcessing = false;

      // Schedule next batch if queue has items
      if (this.queue.length > 0) {
        this.scheduleProcessing();
      }
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    queueSize: number;
    isProcessing: boolean;
    circuitBreakerOpen: boolean;
    circuitBreakerFailures: number;
  } {
    return {
      queueSize: this.queue.length,
      isProcessing: this.isProcessing,
      circuitBreakerOpen: this.circuitBreakerOpen,
      circuitBreakerFailures: this.circuitBreakerFailures,
    };
  }

  /**
   * Flush queue (for testing or graceful shutdown)
   */
  async flush(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Process remaining items
    while (this.queue.length > 0) {
      await this.processBatch();
    }
  }
}

// Singleton instance
let incidentQueueInstance: IncidentQueue | null = null;

export function getIncidentQueue(): IncidentQueue {
  if (!incidentQueueInstance) {
    incidentQueueInstance = new IncidentQueue();
  }
  return incidentQueueInstance;
}

