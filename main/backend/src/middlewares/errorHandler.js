const { HttpError } = require('../utils/httpError');
const { env } = require('../config/env');

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = err instanceof HttpError ? err.status : 500;
  const payload = {
    success: false,
    error: {
      message: status === 500 ? 'Внутренняя ошибка сервера' : err.message,
      status
    }
  };

  if (err.details) payload.error.details = err.details;
  if (env.NODE_ENV !== 'production' && status === 500) {
    payload.error.debug = err.message;
    payload.error.stack = err.stack;
  }

  res.status(status).json(payload);
}

module.exports = { errorHandler };
