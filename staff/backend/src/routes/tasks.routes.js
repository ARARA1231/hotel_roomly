import express from 'express';
import { readDb, updateDb } from '../db/jsonDb.js';
import { requireAuth, requireRoles, canAccessHotel } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { taskCreateSchema, taskUpdateSchema } from '../schemas/task.schema.js';
import { HttpError } from '../middleware/httpError.js';
import { createId } from '../utils/id.js';
import { writeAudit } from '../middleware/audit.js';

const router = express.Router();


function assertEmployeeMatchesHotel(employee, hotelId) {
  if (employee.hotelId !== hotelId) {
    throw new HttpError(400, 'Задачу можно назначить только сотруднику выбранного отеля');
  }
}

function visibleTasks(req, db) {
  if (req.user.role === 'admin') return db.tasks;
  return db.tasks.filter(item => item.employeeId === req.user.employeeId);
}

router.get('/', requireAuth, async (req, res) => {
  const db = await readDb();
  const { employeeId, hotelId, status } = req.query;
  let tasks = visibleTasks(req, db);
  if (employeeId) tasks = tasks.filter(item => item.employeeId === employeeId);
  if (hotelId) tasks = tasks.filter(item => item.hotelId === hotelId);
  if (status) tasks = tasks.filter(item => item.status === status);

  const enriched = tasks.map(task => ({
    ...task,
    employee: db.employees.find(item => item.id === task.employeeId) || null,
    hotel: db.hotels.find(item => item.id === task.hotelId) || null
  }));
  res.json({ ok: true, data: enriched });
});

router.post('/', requireAuth, requireRoles('admin'), validate(taskCreateSchema), async (req, res, next) => {
  const result = await updateDb(db => {
    const employee = db.employees.find(item => item.id === req.body.employeeId);
    if (!employee) throw new HttpError(400, 'Сотрудник не найден');
    assertEmployeeMatchesHotel(employee, req.body.hotelId);
    if (!canAccessHotel(req, req.body.hotelId)) throw new HttpError(403, 'Нет доступа к этому отелю');

    const task = { id: createId('task'), ...req.body, createdBy: req.user.id };
    db.tasks.unshift(task);
    return task;
  }).catch(error => next(error));

  if (!result) return;
  await writeAudit({ req, action: 'task.create', entity: 'task', entityId: result.id, meta: { employeeId: result.employeeId } });
  res.status(201).json({ ok: true, data: result });
});

router.patch('/:id', requireAuth, validate(taskUpdateSchema), async (req, res, next) => {
  const result = await updateDb(db => {
    const task = db.tasks.find(item => item.id === req.params.id);
    if (!task) throw new HttpError(404, 'Задача не найдена');
    const isOwner = req.user.role === 'staff' && task.employeeId === req.user.employeeId;
    const hasManagementAccess = req.user.role === 'admin' && canAccessHotel(req, task.hotelId);
    if (!isOwner && !hasManagementAccess) throw new HttpError(403, 'Нет доступа к этой задаче');

    if (req.user.role === 'staff') {
      const invalid = Object.keys(req.body).filter(key => key !== 'status');
      if (invalid.length) throw new HttpError(403, 'Сотрудник может менять только статус своей задачи');
    }

    const nextTask = { ...task, ...req.body };
    const employee = db.employees.find(item => item.id === nextTask.employeeId);
    if (!employee) throw new HttpError(400, 'Сотрудник не найден');
    if (!canAccessHotel(req, nextTask.hotelId)) throw new HttpError(403, 'Нет доступа к выбранному отелю');
    assertEmployeeMatchesHotel(employee, nextTask.hotelId);

    Object.assign(task, req.body);
    return task;
  }).catch(error => next(error));

  if (!result) return;
  await writeAudit({ req, action: 'task.update', entity: 'task', entityId: result.id, meta: req.body });
  res.json({ ok: true, data: result });
});

router.delete('/:id', requireAuth, requireRoles('admin'), async (req, res, next) => {
  const result = await updateDb(db => {
    const index = db.tasks.findIndex(item => item.id === req.params.id);
    if (index === -1) throw new HttpError(404, 'Задача не найдена');
    const [removed] = db.tasks.splice(index, 1);
    if (!canAccessHotel(req, removed.hotelId)) throw new HttpError(403, 'Нет доступа к этой задаче');
    return removed;
  }).catch(error => next(error));

  if (!result) return;
  await writeAudit({ req, action: 'task.delete', entity: 'task', entityId: result.id });
  res.json({ ok: true, data: result });
});

export default router;
