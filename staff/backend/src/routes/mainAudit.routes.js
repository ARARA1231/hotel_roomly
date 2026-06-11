import express from 'express';
import { env } from '../config/env.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { HttpError } from '../middleware/httpError.js';

const router = express.Router();

async function requestMainRoomly(path) {
  const response = await fetch(`${env.mainRoomlyApiUrl}${path}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-integration-token': env.integrationToken
    }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false) {
    throw new HttpError(response.status || 502, body?.error?.message || 'Основной backend Roomly не ответил на запрос аудита');
  }
  return body.data;
}

router.get('/', requireAuth, requireRoles('admin'), async (req, res, next) => {
  try {
    const params = new URLSearchParams();
    params.set('limit', String(Math.min(Number(req.query.limit || 80), 200)));
    const data = await requestMainRoomly(`/integration/audit-log?${params.toString()}`);
    res.json({ ok: true, data: data.items || [] });
  } catch (error) {
    next(error);
  }
});

export default router;
