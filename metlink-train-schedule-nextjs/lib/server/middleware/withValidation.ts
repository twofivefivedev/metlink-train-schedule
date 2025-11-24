import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validationError } from '@/lib/server/response';
import { logger } from '@/lib/server/logger';

type HandlerContext = Record<string, unknown>;
type RouteHandler<TContext extends HandlerContext = HandlerContext> = (
  request: NextRequest,
  context: TContext
) => Promise<NextResponse>;

function parsePayload(request: NextRequest): Record<string, unknown> | undefined {
  if (request.method === 'GET') {
    return Object.fromEntries(request.nextUrl.searchParams.entries());
  }
  return undefined;
}

export function withValidation<TSchema extends z.ZodTypeAny, TContext extends HandlerContext>(
  schema: TSchema,
  handler: (
    request: NextRequest,
    context: TContext,
    validated: z.infer<TSchema>
  ) => Promise<NextResponse>
): RouteHandler<TContext> {
  return async (request: NextRequest, context: TContext) => {
    try {
      const payload = parsePayload(request);
      const parsed = schema.parse(payload ?? (await request.json().catch(() => ({}))));
      return handler(request, context, parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          validationError('Invalid request parameters', { issues: error.issues }),
          { status: 400 }
        );
      }

      logger.error('Validation middleware failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        validationError('Unable to process request', {
          message: error instanceof Error ? error.message : String(error),
        }),
        { status: 400 }
      );
    }
  };
}

