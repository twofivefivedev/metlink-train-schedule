export type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerOptions {
  failureThreshold: number;
  cooldownMs: number;
  halfOpenMaxCalls: number;
}

export interface CircuitBreakerSnapshot {
  state: CircuitState;
  failureCount: number;
  lastFailureAt: number | null;
  cooldownRemainingMs: number;
}

export class CircuitBreakerOpenError extends Error {
  constructor(message = 'Circuit breaker is open') {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureAt: number | null = null;
  private halfOpenAttempts = 0;

  constructor(private readonly options: CircuitBreakerOptions) {}

  canRequest(): boolean {
    if (this.state === 'open') {
      if (this.lastFailureAt && Date.now() - this.lastFailureAt >= this.options.cooldownMs) {
        this.state = 'half-open';
        this.halfOpenAttempts = 0;
        return true;
      }
      return false;
    }

    if (this.state === 'half-open') {
      if (this.halfOpenAttempts >= this.options.halfOpenMaxCalls) {
        return false;
      }
      this.halfOpenAttempts += 1;
      return true;
    }

    return true;
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
    this.lastFailureAt = null;
    this.halfOpenAttempts = 0;
  }

  recordFailure(): void {
    this.failureCount += 1;
    this.lastFailureAt = Date.now();

    if (this.state === 'half-open' || this.failureCount >= this.options.failureThreshold) {
      this.trip();
    }
  }

  getSnapshot(): CircuitBreakerSnapshot {
    const now = Date.now();
    const cooldownRemainingMs =
      this.state === 'open' && this.lastFailureAt
        ? Math.max(this.options.cooldownMs - (now - this.lastFailureAt), 0)
        : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureAt: this.lastFailureAt,
      cooldownRemainingMs,
    };
  }

  private trip(): void {
    this.state = 'open';
    this.halfOpenAttempts = 0;
  }
}

export const metlinkCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  cooldownMs: 60_000,
  halfOpenMaxCalls: 2,
});

export function getCircuitBreakerSnapshot(): CircuitBreakerSnapshot {
  return metlinkCircuitBreaker.getSnapshot();
}

