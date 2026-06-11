import { readDb } from '../db/jsonDb.js';
import { verifyToken } from '../utils/token.js';
import { HttpError } from './httpError.js';

export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);

  if (!payload) {
    return next(new HttpError(401, 'Необходима авторизация'));
  }

  const db = await readDb();
  const user = db.users.find(item => item.id === payload.sub && item.isActive);
  if (!user) {
    return next(new HttpError(401, 'Пользователь не найден или заблокирован'));
  }

  const employee = db.employees.find(item => item.id === user.employeeId) || null;
  req.user = { ...user, passwordHash: undefined, employee };
  next();
}

export function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new HttpError(401, 'Необходима авторизация'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, 'Недостаточно прав для выполнения операции'));
    }
    next();
  };
}

export function canAccessHotel(req, hotelId) {
  if (!hotelId) {
    return true;
  }
  if (req.user.role === 'admin') {
    return true;
  }
  return req.user.employee?.hotelId === hotelId;
}
