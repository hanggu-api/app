import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import logger from '../utils/logger';

/**
 * Rate Limiting: Proteger API contra abuso
 * - Location: 60 req/min por usuário
 * - Dispatch: 10 req/min (criar serviço)
 * - Payment: 20 req/hora
 */

// Limiter em memória (simples, eficiente para Workers)
const locationLimiter = new RateLimiterMemory({
  points: 60, // 60 requisições
  duration: 60, // por 60 segundos
  blockDurationMs: 60 * 1000, // bloquear por 60s
});

const dispatchLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
  blockDurationMs: 60 * 1000,
});

const paymentLimiter = new RateLimiterMemory({
  points: 20,
  duration: 60 * 60, // 1 hora
  blockDurationMs: 60 * 60 * 1000,
});

/**
 * Middleware de rate limiting para localização
 * - 60 requests por minuto
 */
export const rateLimitLocation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const key = String(req.user?.id || req.ip);
    await locationLimiter.consume(key, 1);
    next();
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      res.status(429).json({
        success: false,
        error: 'Too many location requests',
        retryAfter: Math.ceil(error.msBeforeNext / 1000),
      });
    } else {
      next();
    }
  }
};

/**
 * Middleware de rate limiting para dispatch/criação de serviço
 * - 10 requests por minuto
 */
export const rateLimitDispatch = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const key = String(req.user?.id || req.ip);
    await dispatchLimiter.consume(key, 1);
    next();
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      logger.warn(`[RateLimit] Dispatch limit exceeded for user ${req.user?.id}`);
      res.status(429).json({
        success: false,
        error: 'Too many service requests',
        retryAfter: Math.ceil(error.msBeforeNext / 1000),
      });
    } else {
      next();
    }
  }
};

/**
 * Middleware de rate limiting para pagamentos
 * - 20 requests por hora
 */
export const rateLimitPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const key = String(req.user?.id || req.ip);
    await paymentLimiter.consume(key, 1);
    next();
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      logger.warn(
        `[RateLimit] Payment limit exceeded for user ${req.user?.id}`
      );
      res.status(429).json({
        success: false,
        error: 'Too many payment attempts',
        retryAfter: Math.ceil(error.msBeforeNext / 1000),
      });
    } else {
      next();
    }
  }
};

/**
 * Rate limiter genérico com pontos customizáveis
 */
export function createRateLimiter(
  name: string,
  points: number,
  durationSeconds: number
) {
  const limiter = new RateLimiterMemory({
    points,
    duration: durationSeconds,
    blockDurationMs: durationSeconds * 1000,
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = String(req.user?.id || req.ip);
      await limiter.consume(key, 1);
      next();
    } catch (error) {
      if (error instanceof RateLimiterRes) {
        logger.warn(
          `[RateLimit] ${name} limit exceeded for user ${req.user?.id}`
        );
        res.status(429).json({
          success: false,
          error: `Too many ${name} requests`,
          retryAfter: Math.ceil(error.msBeforeNext / 1000),
        });
      } else {
        next();
      }
    }
  };
}

/**
 * Reset de limiter (para testes ou ajustes)
 */
export function resetRateLimiters() {
  locationLimiter.points = 60;
  dispatchLimiter.points = 10;
  paymentLimiter.points = 20;
}
