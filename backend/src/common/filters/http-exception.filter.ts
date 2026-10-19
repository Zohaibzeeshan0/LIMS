import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Sanitizes strings, URLs, or objects to strip out passwords, tokens, and secrets
 * before any logging takes place.
 */
function sanitizeSecrets(input: string): string {
  if (!input) return input;
  return input
    .replace(/(password|passwd|pwd|secret|token|authorization|refreshToken|accessToken)["':\s=]+([^&,\s"']+)/gi, '$1=***REDACTED***')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer ***REDACTED***');
}

/**
 * AllExceptionsFilter
 * Enterprise cGMP-compliant exception filter:
 * 1. Safe error responses: Stack traces, internal Prisma/SQL database errors, and secrets are NEVER returned to the client.
 * 2. Secrets redaction: Passwords, tokens, and authorization headers are scrubbed from log statements.
 * 3. Consistent JSON schema across all 4xx/5xx responses.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttp ? exception.getResponse() : null;

    let clientMessage = 'An internal server error occurred. Please contact the laboratory administrator.';
    let errorType = 'InternalServerError';

    if (isHttp) {
      if (typeof exceptionResponse === 'string') {
        clientMessage = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const msg = (exceptionResponse as any).message;
        clientMessage = Array.isArray(msg) ? msg.join(', ') : String(msg);
        errorType = (exceptionResponse as any).error || errorType;
      }
    } else if (status < 500 && exception instanceof Error) {
      // 4xx client errors can display safe client message
      clientMessage = exception.message;
    } else {
      // For 500 errors, never leak database queries, Prisma traces, or filesystem paths to client
      clientMessage = 'An unexpected internal server error occurred. Please contact the laboratory administrator.';
    }

    // Safely log error without printing passwords, tokens, or credentials
    const cleanUrl = sanitizeSecrets(request.url);
    const internalErrMsg = exception instanceof Error ? exception.message : String(exception);
    const sanitizedErrMsg = sanitizeSecrets(internalErrMsg);

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${cleanUrl} - Status: ${status} - Error: ${sanitizedErrMsg}`,
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${cleanUrl} - Status: ${status} - Client Error: ${sanitizedErrMsg}`,
      );
    }

    // Secure, standardized response format
    response.status(status).json({
      statusCode: status,
      error: errorType,
      message: clientMessage,
      timestamp: new Date().toISOString(),
      path: cleanUrl,
    });
  }
}
