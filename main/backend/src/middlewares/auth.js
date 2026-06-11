const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { createError } = require('../utils/httpError');
const { getUserById } = require('../services/auth.service');

async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next();

    const payload = jwt.verify(token, env.JWT_SECRET);
    const user = await getUserById(payload.sub);
    if (user) req.user = user;
    return next();
  } catch (_) {
    return next();
  }
}

async function requireAuth(req, res, next) {
  await optionalAuth(req, res, () => {
    if (!req.user) return next(createError(401, 'Нужно войти в аккаунт'));
    next();
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(createError(401, 'Нужно войти в аккаунт'));
    const allowed = roles.flat();
    if (!allowed.includes(req.user.role)) return next(createError(403, 'Недостаточно прав'));
    next();
  };
}

module.exports = { optionalAuth, requireAuth, requireRole };
