import express from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { updateDb } from '../db/jsonDb.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { HttpError } from '../middleware/httpError.js';
import { writeAudit } from '../middleware/audit.js';
import { createId } from '../utils/id.js';

const router = express.Router();

const bookingEventSchema = z.object({
  event: z.enum(['created', 'updated', 'cancelled', 'deleted']),
  booking: z.object({
    id: z.string().min(1),
    hotelId: z.string().min(2),
    guestName: z.string().min(1).max(120).default('Гость Roomly'),
    email: z.string().email().optional().nullable(),
    phone: z.string().max(40).optional().nullable(),
    guests: z.number().int().min(1).max(20).optional(),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    status: z.string().optional(),
    totalPrice: z.number().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
  })
});

function requireIntegrationToken(req, _res, next) {
  const token = req.headers['x-integration-token'];
  if (!env.integrationToken || token !== env.integrationToken) {
    return next(new HttpError(401, 'Некорректный токен интеграции'));
  }
  next();
}

function chooseEmployeeForBooking(db, hotelId) {
  const activeEmployees = db.employees.filter(employee => employee.hotelId === hotelId && employee.status === 'active');
  return activeEmployees.find(employee => /ресепшен|администратор|менеджер/i.test(`${employee.position} ${employee.skills?.join(' ') || ''}`))
    || activeEmployees[0]
    || db.employees.find(employee => employee.status === 'active')
    || null;
}

function bookingTaskTitle(booking) {
  return `Подготовить заселение гостя ${booking.guestName || 'Roomly'}`;
}

function bookingTaskDescription(booking, event) {
  const parts = [
    `Источник: основной сайт Roomly`,
    `Событие: ${event}`,
    `Бронирование: ${booking.id}`,
    `Гость: ${booking.guestName || 'не указан'}`,
    `Даты: ${booking.checkIn}${booking.checkOut ? ` — ${booking.checkOut}` : ''}`
  ];

  if (booking.email) parts.push(`Email: ${booking.email}`);
  if (booking.phone) parts.push(`Телефон: ${booking.phone}`);
  if (booking.guests) parts.push(`Гостей: ${booking.guests}`);
  if (booking.totalPrice) parts.push(`Сумма: ${booking.totalPrice}`);

  return parts.join('\n');
}

function upsertBookingTask(db, event, booking) {
  const hotel = db.hotels.find(item => item.id === booking.hotelId && item.isActive !== false);
  if (!hotel) {
    throw new HttpError(400, `Отель ${booking.hotelId} не найден в модуле персонала`);
  }

  const existingTask = db.tasks.find(task => task.source?.system === 'roomly-main' && task.source?.bookingId === booking.id);

  if (event === 'deleted') {
    if (existingTask) {
      existingTask.status = 'cancelled';
      existingTask.description = `${existingTask.description || ''}\n\nБронирование удалено в основном модуле.`.trim();
    }
    return existingTask || null;
  }

  const assignedEmployee = existingTask
    ? db.employees.find(employee => employee.id === existingTask.employeeId) || chooseEmployeeForBooking(db, booking.hotelId)
    : chooseEmployeeForBooking(db, booking.hotelId);

  if (!assignedEmployee) {
    throw new HttpError(409, 'Нет активного сотрудника для назначения задачи');
  }

  const taskPayload = {
    title: bookingTaskTitle(booking),
    description: bookingTaskDescription(booking, event),
    employeeId: assignedEmployee.id,
    hotelId: booking.hotelId,
    priority: event === 'cancelled' ? 'low' : 'medium',
    status: event === 'cancelled' ? 'cancelled' : existingTask?.status || 'open',
    dueDate: booking.checkIn,
    source: {
      system: 'roomly-main',
      bookingId: booking.id,
      lastEvent: event,
      syncedAt: new Date().toISOString()
    }
  };

  if (existingTask) {
    Object.assign(existingTask, taskPayload);
    return existingTask;
  }

  const task = {
    id: createId('task'),
    ...taskPayload,
    createdBy: 'integration:roomly-main'
  };
  db.tasks.unshift(task);
  return task;
}

router.get('/roomly-status', requireAuth, async (_req, res) => {
  try {
    const response = await fetch(`${env.mainRoomlyApiUrl}/health`, { signal: AbortSignal.timeout(1500) });
    const data = await response.json().catch(() => null);
    res.json({ ok: true, data: { connected: response.ok, mainRoomlyApiUrl: env.mainRoomlyApiUrl, response: data } });
  } catch {
    res.json({ ok: true, data: { connected: false, mainRoomlyApiUrl: env.mainRoomlyApiUrl, message: 'Основной сайт Roomly сейчас недоступен или не запущен' } });
  }
});

router.post('/booking-event', requireIntegrationToken, async (req, res, next) => {
  const parsed = bookingEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new HttpError(400, 'Данные бронирования не прошли валидацию', parsed.error.issues));
  }

  try {
    const { event, booking } = parsed.data;
    const task = await updateDb(db => upsertBookingTask(db, event, booking));
    await writeAudit({
      req,
      action: `integration.booking.${event}`,
      entity: 'booking',
      entityId: booking.id,
      meta: { taskId: task?.id || null, hotelId: booking.hotelId }
    });
    res.status(event === 'created' ? 201 : 200).json({ ok: true, data: { task } });
  } catch (error) {
    next(error);
  }
});

router.post('/bookings-to-tasks', requireAuth, requireRoles('admin'), async (req, res, next) => {
  const bookings = Array.isArray(req.body?.bookings) ? req.body.bookings : [];

  try {
    const createdTasks = await updateDb(db => bookings.slice(0, 20).map(rawBooking => {
      const parsed = bookingEventSchema.shape.booking.safeParse({
        id: String(rawBooking.id || createId('booking')),
        hotelId: rawBooking.hotelId || req.user.employee?.hotelId || 'ikeja-lagos',
        guestName: rawBooking.guestName || 'Гость Roomly',
        email: rawBooking.email || null,
        phone: rawBooking.phone || null,
        guests: Number(rawBooking.guests || 1),
        checkIn: String(rawBooking.checkIn || new Date().toISOString().slice(0, 10)).slice(0, 10),
        checkOut: rawBooking.checkOut ? String(rawBooking.checkOut).slice(0, 10) : undefined,
        status: rawBooking.status || 'confirmed',
        totalPrice: rawBooking.totalPrice ? Number(rawBooking.totalPrice) : undefined
      });

      if (!parsed.success) {
        throw new HttpError(400, 'Одно из бронирований содержит некорректные данные', parsed.error.issues);
      }

      return upsertBookingTask(db, 'created', parsed.data);
    }));

    await writeAudit({ req, action: 'integration.bookings_to_tasks', entity: 'task', entityId: 'bulk', meta: { count: createdTasks.length } });
    res.status(201).json({ ok: true, data: createdTasks });
  } catch (error) {
    next(error);
  }
});

export default router;
