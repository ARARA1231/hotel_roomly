export class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function notFoundHandler(req, _res, next) {
  next(new HttpError(404, 'Маршрут API не найден'));
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const message = status === 500 ? 'Внутренняя ошибка сервера' : err.message;

  if (status === 500) {
    console.error(err);
  }

  res.status(status).json({
    ok: false,
    error: {
      message,
      details: err.details || null
    }
  });
}
