import express from 'express';
import { readDb } from '../db/jsonDb.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = express.Router();

router.get('/staff-load', requireAuth, requireRoles('admin'), async (req, res) => {
  const db = await readDb();
  const hotelId = req.query.hotelId;
  const employees = hotelId ? db.employees.filter(item => item.hotelId === hotelId) : db.employees;

  const rows = employees.map(employee => {
    const shifts = db.shifts.filter(item => item.employeeId === employee.id && item.status !== 'cancelled');
    const openTasks = db.tasks.filter(item => item.employeeId === employee.id && ['open', 'in_progress'].includes(item.status));
    const hours = shifts.reduce((sum, shift) => sum + Math.max(0, (new Date(shift.endsAt) - new Date(shift.startsAt)) / 3600000), 0);
    return {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      hotelId: employee.hotelId,
      status: employee.status,
      shiftsCount: shifts.length,
      plannedHours: Number(hours.toFixed(1)),
      openTasks: openTasks.length
    };
  });

  res.json({ ok: true, data: rows });
});

export default router;
