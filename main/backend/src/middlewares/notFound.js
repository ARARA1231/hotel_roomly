const { createError } = require('../utils/httpError');

function notFound(req, res, next) {
  next(createError(404, `Маршрут не найден: ${req.method} ${req.originalUrl}`));
}

module.exports = { notFound };
