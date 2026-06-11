import express from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { HttpError } from '../middleware/httpError.js';
import { writeAudit } from '../middleware/audit.js';

const router = express.Router();

const statusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed'])
});

async function requestMainRoomly(path, options = {}) {
  const response = await fetch(`${env.mainRoomlyApiUrl}${path}`, {
    ...options,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-integration-token': env.integrationToken,
      ...(options.headers || {})
    }
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false) {
    throw new HttpError(response.status || 502, body?.error?.message || 'Основной backend Roomly не ответил на запрос бронирований');
  }
  return body.data;
}

function parseSchema(schema, source) {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    throw new HttpError(400, 'Данные не прошли валидацию', parsed.error.issues);
  }
  return parsed.data;
}

router.get('/', requireAuth, requireRoles('admin', 'staff'), async (req, res, next) => {
  try {
    const params = new URLSearchParams();
    if (req.query.status) params.set('status', String(req.query.status));
    if (req.query.q) params.set('q', String(req.query.q));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const data = await requestMainRoomly(`/integration/bookings${suffix}`);
    res.json({ ok: true, data: data.items || [] });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', requireAuth, requireRoles('admin', 'staff'), async (req, res, next) => {
  try {
    const payload = parseSchema(statusSchema, req.body);
    const data = await requestMainRoomly(`/integration/bookings/${encodeURIComponent(req.params.id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    await writeAudit({ req, action: `booking.status.${payload.status}`, entity: 'booking', entityId: req.params.id });
    res.json({ ok: true, data: data.booking });
  } catch (error) {
    next(error);
  }
});

export default router;
