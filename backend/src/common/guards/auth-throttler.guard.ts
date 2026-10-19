import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

interface RateLimitRecord {
  count: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  blockedUntil?: number;
}

/**
 * AuthThrottlerGuard
 * Rate limiting guard for authentication endpoints (login, refresh, password reset).
 * Protects against brute-force attacks and credential stuffing compliant with FDA 21 CFR Part 11:
 * - Sliding window tracking by Client IP
 * - Max 5 attempts per 60 seconds
 * - Temporarily throttles offending IP for 60 seconds
 * - Automatically logs security alert in AuditTrail upon lockout
 * - Injects standard Retry-After and X-RateLimit headers
 * - NEVER logs or stores sensitive credentials or passwords
 */
@Injectable()
export class AuthThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(AuthThrottlerGuard.name);
  private static readonly tracker = new Map<string, RateLimitRecord>();

  // Configuration
  private readonly maxAttempts = 5;
  private readonly windowMs = 60 * 1000; // 60 seconds
  private readonly lockoutDurationMs = 60 * 1000; // 60 seconds lockout

  constructor(private readonly prisma?: PrismaService) {
    // Periodic garbage collection every 5 minutes to prevent memory leaks
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of AuthThrottlerGuard.tracker.entries()) {
        if (
          now - record.lastAttemptAt > this.windowMs * 2 &&
          (!record.blockedUntil || now > record.blockedUntil)
        ) {
          AuthThrottlerGuard.tracker.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const clientIp = this.getClientIp(req);
    const key = `auth:${clientIp}`;
    const now = Date.now();

    let record = AuthThrottlerGuard.tracker.get(key);

    if (!record) {
      record = {
        count: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
      };
      AuthThrottlerGuard.tracker.set(key, record);
      this.setHeaders(res, this.maxAttempts - 1, Math.ceil(this.windowMs / 1000));
      return true;
    }

    // Check if client is currently in lockout
    if (record.blockedUntil && now < record.blockedUntil) {
      const remainingSec = Math.ceil((record.blockedUntil - now) / 1000);
      res.setHeader('Retry-After', remainingSec);
      res.setHeader('X-RateLimit-Limit', this.maxAttempts);
      res.setHeader('X-RateLimit-Remaining', 0);

      this.logger.warn(
        `Throttled client [${clientIp}] attempted auth during lockout. Retry-After: ${remainingSec}s`,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Too many authentication attempts. Client IP is temporarily throttled per 21 CFR Part 11 security policy. Please try again after ${remainingSec} seconds.`,
          retryAfter: remainingSec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Reset window if past windowMs
    if (now - record.firstAttemptAt > this.windowMs) {
      record.count = 1;
      record.firstAttemptAt = now;
      record.lastAttemptAt = now;
      record.blockedUntil = undefined;
      this.setHeaders(res, this.maxAttempts - 1, Math.ceil(this.windowMs / 1000));
      return true;
    }

    // Increment attempt count within active window
    record.count += 1;
    record.lastAttemptAt = now;

    if (record.count > this.maxAttempts) {
      record.blockedUntil = now + this.lockoutDurationMs;
      const retryAfterSec = Math.ceil(this.lockoutDurationMs / 1000);

      res.setHeader('Retry-After', retryAfterSec);
      res.setHeader('X-RateLimit-Limit', this.maxAttempts);
      res.setHeader('X-RateLimit-Remaining', 0);

      this.logger.warn(
        `Brute force rate limit exceeded for client [${clientIp}]. Lockout enforced for ${retryAfterSec}s`,
      );

      // 21 CFR Part 11 Security Audit Trail Log (Safely omitting passwords/tokens)
      if (this.prisma) {
        try {
          await this.prisma.auditTrail.create({
            data: {
              entityName: 'SecurityEvent',
              entityId: clientIp,
              action: 'RATE_LIMIT_EXCEEDED',
              performedByName: 'Security Throttler Guard',
              role: 'SYSTEM',
              ipAddress: clientIp,
              reasonForChange: `Workstation exceeded ${this.maxAttempts} authentication attempts within 60s. Temporary lockout enforced.`,
            },
          });
        } catch (e) {
          // Non-blocking if db write fails
        }
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Too many authentication attempts. Client IP is temporarily throttled per 21 CFR Part 11 security policy. Please try again after ${retryAfterSec} seconds.`,
          retryAfter: retryAfterSec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const remaining = Math.max(0, this.maxAttempts - record.count);
    const resetTimeSec = Math.ceil((this.windowMs - (now - record.firstAttemptAt)) / 1000);
    this.setHeaders(res, remaining, resetTimeSec);

    return true;
  }

  /**
   * Reset rate limit upon successful login
   */
  public static resetLimit(clientIp: string) {
    const key = `auth:${clientIp}`;
    AuthThrottlerGuard.tracker.delete(key);
  }

  private setHeaders(res: Response, remaining: number, resetTimeSec: number) {
    if (res && typeof res.setHeader === 'function') {
      res.setHeader('X-RateLimit-Limit', this.maxAttempts);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTimeSec);
    }
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return (
      req.ip ||
      req.socket?.remoteAddress ||
      '127.0.0.1'
    );
  }
}
