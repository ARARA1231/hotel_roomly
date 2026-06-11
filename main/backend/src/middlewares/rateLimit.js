function rateLimit({ windowMs = 60_000, limit = 120 } = {}) {
  const buckets = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - bucket.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > limit) {
      return res.status(429).json({
        success: false,
        error: { status: 429, message: 'Слишком много запросов. Попробуйте позже.' }
      });
    }

    next();
  };
}

module.exports = { rateLimit };
