import { storage } from "./storage-clean";

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async middleware(req: any, res: any, next: any) {
    try {
      // Check for rate limit bypass password
      const bypassPassword = req.headers['x-rate-limit-bypass'] || req.query.bypass;
      if (bypassPassword === 'rate_limit_bypass_X9K2mQ7pL4nW8vR3') {
        return next(); // Bypass rate limiting
      }

      const identifier = this.getIdentifier(req);
      const key = `rate_limit:${identifier}`;
      
      const current = await storage.getRateLimit(key);
      const now = Date.now();
      
      // Check if within rate limit
      if (current >= this.config.maxRequests) {
        await storage.logActivity({
          type: "rate_limit_exceeded",
          description: `Rate limit exceeded for ${identifier}`,
          metadata: {
            identifier,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.path,
            limit: this.config.maxRequests,
            windowMs: this.config.windowMs
          }
        });

        return res.status(429).json({
          error: "Rate limit exceeded",
          message: this.config.message || "Too many requests, please try again later",
          retryAfter: Math.ceil(this.config.windowMs / 1000)
        });
      }

      // Increment counter
      await storage.setRateLimit(key, current + 1, this.config.windowMs);
      
      next();
    } catch (error) {
      console.error("Rate limiter error:", error);
      // On error, allow request but log it
      await storage.logActivity({
        type: "rate_limiter_error",
        description: `Rate limiter error: ${error}`,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          ip: req.ip,
          endpoint: req.path
        }
      });
      next();
    }
  }

  private getIdentifier(req: any): string {
    // Use session key if available, otherwise fall back to IP
    const sessionKeyId = (req.session as any)?.dashboardKeyId;
    if (sessionKeyId) {
      return `key:${sessionKeyId}`;
    }
    return `ip:${req.ip}`;
  }
}

// Rate limit configurations
export const rateLimits = {
  // Authentication attempts
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: "Too many authentication attempts. Please wait before trying again."
  }),

  // Dashboard key validation
  keyValidation: new RateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10,
    message: "Too many key validation attempts. Please wait before trying again."
  }),

  // General API usage
  api: new RateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 60,
    message: "API rate limit exceeded. Please slow down your requests."
  }),

  // Key generation (strict)
  keyGeneration: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: "Too many key generation attempts. Please wait before creating more keys."
  }),

  // Backup operations
  backups: new RateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 5,
    message: "Too many backup operations. Please wait before performing more backups."
  }),

  // Admin operations
  admin: new RateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 20,
    message: "Admin rate limit exceeded. Please slow down administrative actions."
  })
};

// Helper function to create rate limit middleware
export function createRateLimit(config: RateLimitConfig) {
  return new RateLimiter(config).middleware.bind(new RateLimiter(config));
}