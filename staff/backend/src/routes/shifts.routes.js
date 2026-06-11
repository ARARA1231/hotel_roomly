import express from 'express';
import { readDb, updateDb } from '../db/jsonDb.js';
import { requireAuth, requireRoles, canAccessHotel } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { shiftCreateSchema, shiftUpdateSchema } from '../schemas/shift.schema.js';
import { HttpError } from '../middleware/httpError.js';
import { createId } from '../utils/id.js';
import { writeAudit } from '../middleware/audit.js';

const router = express.Router();


function assertEmployeeMatchesHotel(employee, hotelId) {
  if (employee.hotelId !== hotelId) {
    throw new HttpError(400, 'Сотрудник относится к другому отелю');
  }
}

function visibleShifts(req, db) {
  if (req.user.role === 'admin') return db.shifts;
  return db.shifts.filter(item => item.employeeId === req.user.employeeId);
}

function hasShiftConflict(db, shift, excludeId = null) {
  const start = new Date(shift.startsAt).getTime();
  const end = new Date(shift.endsAt).getTime();
  return db.shifts.some(item => {
    if (item.id === excludeId || item.employeeId !== shift.employeeId || item.status === 'cancelled') return false;
    const itemStart = new Date(item.startsAt).getTime();
    const itemEnd = new Date(item.endsAt).getTime();
    return start < itemEnd && end > itemStart;
  });
}

router.get('/', requireAuth, async (req, res) => {
  const db = await readDb();
  const { employeeId, hotelId, status } = req.query;
  let shifts = visibleShifts(req, db);
  if (employeeId) shifts = shifts.filter(item => item.employeeId === employeeId);
  if (hotelId) shifts = shifts.filter(item => item.hotelId === hotelId);
  if (status) shifts = shifts.filter(item => item.status === status);

  const enriched = shifts.map(shift => ({
    ...shift,
    employee: db.employees.find(item => item.id === shift.employeeId) || null,
    hotel: db.hotels.find(item => item.id === shift.hotelId) || null
  }));
  res.json({ ok: true, data: enriched });
});

router.post('/', requireAuth, requireRoles('admin'), validate(shiftCreateSchema), async (req, res, next) => {
  const result = await updateDb(db => {
    const employee = db.employees.find(item => item.id === req.body.employeeId);
    if (!employee) throw new HttpError(400, 'Сотрудник не найден');
    if (!canAccessHotel(req, req.body.hotelId)) throw new HttpError(403, 'Нет доступа к этому отелю');
    assertEmployeeMatchesHotel(employee, req.body.hotelId);
    if (employee.status !== 'active') throw new HttpError(400, 'Нельзя назначить смену неактивному сотруднику');
    if (hasShiftConflict(db, req.body)) throw new HttpError(409, 'У сотрудника уже есть смена в это время');

    const shift = { id: createId('shift'), ...req.body };
    db.shifts.unshift(shift);
    return shift;
  }).catch(error => next(error));

  if (!result) return;
  await writeAudit({ req, action: 'shift.create', entity: 'shift', entityId: result.id, meta: { employeeId: result.employeeId } });
  res.status(201).json({ ok: true, data: result });
});

router.patch('/:id', requireAuth, requireRoles('admin'), validate(shiftUpdateSchema), async (req, res, next) => {
  const result = await updateDb(db => {
    const shift = db.shifts.find(item => item.id === req.params.id);
    if (!shift) throw new HttpError(404, 'Смена не найдена');
    if (!canAccessHotel(req, shift.hotelId)) throw new HttpError(403, 'Нет доступа к этой смене');

    const nextShift = { ...shift, ...req.body };
    const employee = db.employees.find(item => item.id === nextShift.employeeId);
    if (!employee) throw new HttpError(400, 'Сотрудник не найден');
    if (!canAccessHotel(req, nextShift.hotelId)) throw new HttpError(403, 'Нет доступа к этому отелю');
    assertEmployeeMatchesHotel(employee, nextShift.hotelId);
    if (hasShiftConflict(db, nextShift, shift.id)) throw new HttpError(409, 'У сотрудника уже есть смена в это время');
    Object.assign(shift, req.body);
    return shift;
  }).catch(error => next(error));

  if (!result) return;
  await writeAudit({ req, action: 'shift.update', entity: 'shift', entityId: result.id, meta: req.body });
  res.json({ ok: true, data: result });
});

router.delete('/:id', requireAuth, requireRoles('admin'), async (req, res, next) => {
  const result = await updateDb(db => {
    const index = db.shifts.findIndex(item => item.id === req.params.id);
    if (index === -1) throw new HttpError(404, 'Смена не найдена');
    const [removed] = db.shifts.splice(index, 1);
    if (!canAccessHotel(req, removed.hotelId)) throw new HttpError(403, 'Нет доступа к этой смене');
    return removed;
  }).catch(error => next(error));

  if (!result) return;
  await writeAudit({ req, action: 'shift.delete', entity: 'shift', entityId: result.id });
  res.json({ ok: true, data: result });
});

export default router;
