import express from 'express';
import { readDb } from '../db/jsonDb.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/hotels', requireAuth, async (_req, res) => {
  const db = await readDb();
  res.json({ ok: true, data: db.hotels });
});

router.get('/departments', requireAuth, async (req, res) => {
  const db = await readDb();
  const { hotelId } = req.query;
  const departments = hotelId ? db.departments.filter(item => item.hotelId === hotelId) : db.departments;
  res.json({ ok: true, data: departments });
});

export default router;
