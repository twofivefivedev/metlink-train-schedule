import { randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';

export interface RequestContext {
  requestId: string;
  traceId: string;
  userAgent?: string | null;
}

export function createRequestContext(request: NextRequest): RequestContext {
  const headerRequestId = request.headers.get('x-request-id');
  const requestId = headerRequestId && headerRequestId.trim().length > 0 ? headerRequestId : randomUUID();
  const traceHeader = request.headers.get('x-trace-id') || request.headers.get('traceparent');
  const traceId = traceHeader && traceHeader.includes('-') ? traceHeader.split('-')[1] || traceHeader : traceHeader || requestId;

  return {
    requestId,
    traceId,
    userAgent: request.headers.get('user-agent'),
  };
}

export function withRequestContext<T extends Record<string, unknown>>(
  metadata: T,
  context?: RequestContext
): T & Partial<RequestContext> {
  if (!context) {
    return metadata;
  }

  return {
    requestId: context.requestId,
    traceId: context.traceId,
    ...metadata,
  };
}

