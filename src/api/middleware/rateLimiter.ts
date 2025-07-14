import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '@/core/redis';
import { logger } from '@/utils/logger';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
}

const defaultOptions: RateLimitOptions = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  keyGenerator: (req: Request) => req.ip || 'unknown',
  skipSuccessfulRequests: false,
};

export const createRateLimiter = (options: Partial<RateLimitOptions> = {}) => {
  const opts = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const redis = getRedisClient();
      const key = `rate_limit:${opts.keyGenerator!(req)}`;
      const now = Date.now();
      const window = Math.floor(now / opts.windowMs);
      const windowKey = `${key}:${window}`;

      const current = await redis.get(windowKey);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= opts.maxRequests) {
        logger.warn(`Rate limit exceeded for ${opts.keyGenerator!(req)}`, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.url,
          method: req.method,
        });

        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: opts.windowMs / 1000,
        });
        return;
      }

      await redis.setEx(windowKey, Math.ceil(opts.windowMs / 1000), (count + 1).toString());

      res.setHeader('X-RateLimit-Limit', opts.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, opts.maxRequests - count - 1));
      res.setHeader('X-RateLimit-Reset', new Date(now + opts.windowMs).toISOString());

      next();
    } catch (error) {
      logger.error('Rate limiter error:', error);
      next();
    }
  };
};

export const rateLimiter = createRateLimiter();

export const strictRateLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 10,
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 900000, // 15 minutes
  maxRequests: 1000,
});