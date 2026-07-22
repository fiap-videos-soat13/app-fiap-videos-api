import rateLimit from 'express-rate-limit';

export function createLoginRateLimiter() {
  const windowMs = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
  const max = Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'TOO_MANY_REQUESTS',
      message: 'Muitas tentativas de login. Tente novamente mais tarde.',
    },
  });
}
