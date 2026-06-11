class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

function createError(status, message, details = null) {
  return new HttpError(status, message, details);
}

module.exports = { HttpError, createError };
