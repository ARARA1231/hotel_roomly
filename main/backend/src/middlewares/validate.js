const { createError } = require('../utils/httpError');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }));
      return next(createError(400, 'Данные не прошли валидацию', details));
    }
    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
