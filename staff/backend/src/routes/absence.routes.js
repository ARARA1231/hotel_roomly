import express from 'express';
import { readDb, updateDb } from '../db/jsonDb.js';
import { requireAuth, requireRoles, canAccessHotel } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { absenceCreateSchema, absenceUpdateSchema } from '../schemas/absence.schema.js';
import { HttpError } from '../middleware/httpError.js';
import { createId } from '../utils/id.js';
import { writeAudit } from '../middleware/audit.js';

const router = express.Router();

function visibleAbsences(req, db) {
  if (req.user.role === 'admin') return db.absenceRequests;
  return db.absenceRequests.filter(item => item.employeeId === req.user.employeeId);
}

router.get('/', requireAuth, async (req, res) => {
  const db = await readDb();
  const absences = visibleAbsences(req, db).map(absence => ({
    ...absence,
    employee: db.employees.find(item => item.id === absence.employeeId) || null
  }));
  res.json({ ok: true, data: absences });
});

router.post('/', requireAuth, requireRoles('admin'), validate(absenceCreateSchema), async (req, res, next) => {
  const result = await updateDb(db => {
    const employee = db.employees.find(item => item.id === req.body.employeeId);
    if (!employee) throw new HttpError(400, 'Сотрудник не найден');
    if (req.user.role === 'staff' && req.user.employeeId !== employee.id) throw new HttpError(403, 'Можно создавать заявки только для себя');
    if (!canAccessHotel(req, employee.hotelId)) throw new HttpError(403, 'Нет доступа к сотруднику');

    const absence = { id: createId('absence'), ...req.body };
    if (req.user.role === 'staff') absence.status = 'pending';
    db.absenceRequests.unshift(absence);
    return absence;
  }).catch(error => next(error));

  if (!result) return;
  await writeAudit({ req, action: 'absence.create', entity: 'absence', entityId: result.id, meta: { employeeId: result.employeeId } });
  res.status(201).json({ ok: true, data: result });
});

router.patch('/:id', requireAuth, requireRoles('admin'), validate(absenceUpdateSchema), async (req, res, next) => {
  const result = await updateDb(db => {
    const absence = db.absenceRequests.find(item => item.id === req.params.id);
    if (!absence) throw new HttpError(404, 'Заявка отсутствия не найдена');
    const employee = db.employees.find(item => item.id === absence.employeeId);
    if (!canAccessHotel(req, employee?.hotelId)) throw new HttpError(403, 'Нет доступа к заявке');
    Object.assign(absence, req.body);
    return absence;
  }).catch(error => next(error));

  if (!result) return;
  await writeAudit({ req, action: 'absence.update', entity: 'absence', entityId: result.id, meta: req.body });
  res.json({ ok: true, data: result });
});

export default router;
