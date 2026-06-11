import { HttpError } from './httpError.js';

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message
      }));
      return next(new HttpError(400, 'Данные не прошли валидацию', details));
    }
    req[source] = result.data;
    next();
  };
}
