import express from 'express';
import { readDb } from '../db/jsonDb.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, requireRoles('admin'), async (req, res) => {
  const db = await readDb();
  const limit = Math.min(Number(req.query.limit || 100), 300);
  res.json({ ok: true, data: db.audit.slice(0, limit) });
});

export default router;
