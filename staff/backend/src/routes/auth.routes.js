import express from 'express';
import { readDb } from '../db/jsonDb.js';
import { loginSchema } from '../schemas/auth.schema.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/httpError.js';
import { verifyPassword } from '../utils/password.js';
import { createToken } from '../utils/token.js';
import { requireAuth } from '../middleware/auth.js';
import { writeAudit } from '../middleware/audit.js';

const router = express.Router();

function publicUser(user, employee) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId,
    hotelId: employee?.hotelId || null
  };
}

router.post('/login', validate(loginSchema), async (req, res, next) => {
  const { email, password } = req.body;
  const db = await readDb();
  const user = db.users.find(item => item.email.toLowerCase() === email.toLowerCase() && item.isActive);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return next(new HttpError(401, 'Неверный email или пароль'));
  }

  const employee = db.employees.find(item => item.id === user.employeeId) || null;
  const token = createToken({ sub: user.id, role: user.role, email: user.email });
  req.user = { ...user, employee };
  await writeAudit({ req, action: 'auth.login', entity: 'user', entityId: user.id });

  res.json({ ok: true, data: { token, user: publicUser(user, employee) } });
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ ok: true, data: { user: publicUser(req.user, req.user.employee) } });
});

export default router;
