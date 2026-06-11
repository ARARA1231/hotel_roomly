import express from 'express';
import { readDb, updateDb } from '../db/jsonDb.js';
import { requireAuth, requireRoles, canAccessHotel } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { employeeCreateSchema, employeeUpdateSchema } from '../schemas/employee.schema.js';
import { HttpError } from '../middleware/httpError.js';
import { createId } from '../utils/id.js';
import { writeAudit } from '../middleware/audit.js';

const router = express.Router();


function assertDepartmentBelongsToHotel(db, departmentId, hotelId) {
  const department = db.departments.find(item => item.id === departmentId);
  if (!department) throw new HttpError(400, 'Указанный отдел не найден');
  if (department.hotelId !== hotelId) throw new HttpError(400, 'Отдел не относится к выбранному отелю');
  return department;
}

function filterVisible(req, employees) {
  if (req.user.role === 'admin') return employees;
  return employees.filter(item => item.id === req.user.employeeId);
}

router.get('/', requireAuth, async (req, res) => {
  const db = await readDb();
  const { hotelId, status, q } = req.query;
  let employees = filterVisible(req, db.employees);

  if (hotelId) employees = employees.filter(item => item.hotelId === hotelId);
  if (status) employees = employees.filter(item => item.status === status);
  if (q) {
    const query = String(q).toLowerCase();
    employees = employees.filter(item => `${item.firstName} ${item.lastName} ${item.email} ${item.position}`.toLowerCase().includes(query));
  }

  const enriched = employees.map(employee => ({
    ...employee,
    hotel: db.hotels.find(item => item.id === employee.hotelId) || null,
    department: db.departments.find(item => item.id === employee.departmentId) || null
  }));

  res.json({ ok: true, data: enriched });
});

router.get('/:id', requireAuth, async (req, res, next) => {
  const db = await readDb();
  const employee = db.employees.find(item => item.id === req.params.id);
  if (!employee) return next(new HttpError(404, 'Сотрудник не найден'));
  if (!filterVisible(req, [employee]).length) return next(new HttpError(403, 'Нет доступа к этому сотруднику'));
  res.json({ ok: true, data: employee });
});

router.post('/', requireAuth, requireRoles('admin'), validate(employeeCreateSchema), async (req, res, next) => {
  const result = await updateDb(db => {
    if (!db.hotels.some(item => item.id === req.body.hotelId)) throw new HttpError(400, 'Указанный отель не найден');
    assertDepartmentBelongsToHotel(db, req.body.departmentId, req.body.hotelId);
    if (db.employees.some(item => item.email.toLowerCase() === req.body.email.toLowerCase())) throw new HttpError(409, 'Сотрудник с таким email уже существует');

    const employee = { id: createId('emp'), ...req.body };
    db.employees.unshift(employee);
    return employee;
  }).catch(error => next(error));

  if (!result) return;
  await writeAudit({ req, action: 'employee.create', entity: 'employee', entityId: result.id, meta: { email: result.email } });
  res.status(201).json({ ok: true, data: result });
});

router.patch('/:id', requireAuth, requireRoles('admin'), validate(employeeUpdateSchema), async (req, res, next) => {
  const result = await updateDb(db => {
    const employee = db.employees.find(item => item.id === req.params.id);
    if (!employee) throw new HttpError(404, 'Сотрудник не найден');
    if (!canAccessHotel(req, employee.hotelId)) throw new HttpError(403, 'Нет доступа к этому сотруднику');
    const nextHotelId = req.body.hotelId || employee.hotelId;
    const nextDepartmentId = req.body.departmentId || employee.departmentId;
    if (req.body.hotelId && !db.hotels.some(item => item.id === req.body.hotelId)) throw new HttpError(400, 'Указанный отель не найден');
    if (req.body.departmentId || req.body.hotelId) assertDepartmentBelongsToHotel(db, nextDepartmentId, nextHotelId);

    Object.assign(employee, req.body);
    return employee;
  }).catch(error => next(error));

  if (!result) return;
  await writeAudit({ req, action: 'employee.update', entity: 'employee', entityId: result.id, meta: req.body });
  res.json({ ok: true, data: result });
});

router.delete('/:id', requireAuth, requireRoles('admin'), async (req, res, next) => {
  const result = await updateDb(db => {
    const index = db.employees.findIndex(item => item.id === req.params.id);
    if (index === -1) throw new HttpError(404, 'Сотрудник не найден');
    const [removed] = db.employees.splice(index, 1);
    db.shifts = db.shifts.filter(item => item.employeeId !== removed.id);
    db.tasks = db.tasks.filter(item => item.employeeId !== removed.id);
    return removed;
  }).catch(error => next(error));

  if (!result) return;
  await writeAudit({ req, action: 'employee.delete', entity: 'employee', entityId: result.id, meta: { email: result.email } });
  res.json({ ok: true, data: result });
});

export default router;
