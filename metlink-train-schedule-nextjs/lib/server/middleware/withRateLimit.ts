import { NextRequest, NextResponse } from 'next/server';

type RateLimitOptions = {
  limit: number;
  windowMs: number;
  key?: (request: NextRequest) => string;
};

type Bucket = {
  count: number;
  expiresAt: number;
};

const buckets = new Map<string, Bucket>();

function getClientKey(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'anonymous'
  );
}

export function withRateLimit<TContext>(
  options: RateLimitOptions,
  handler: (request: NextRequest, context: TContext) => Promise<NextResponse>
) {
  const { limit, windowMs, key } = options;

  return async (request: NextRequest, context: TContext) => {
    if (limit <= 0 || windowMs <= 0) {
      return handler(request, context);
    }

    const identifier = key ? key(request) : getClientKey(request);
    const now = Date.now();
    const bucket = buckets.get(identifier);

    if (!bucket || bucket.expiresAt <= now) {
      buckets.set(identifier, { count: 1, expiresAt: now + windowMs });
    } else if (bucket.count >= limit) {
      const retryAfter = Math.ceil((bucket.expiresAt - now) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Rate limit exceeded. Please try again shortly.',
            code: 'RATE_LIMIT',
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    } else {
      bucket.count += 1;
    }

    return handler(request, context);
  };
}

