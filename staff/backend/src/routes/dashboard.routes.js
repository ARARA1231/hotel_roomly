import express from 'express';
import { readDb } from '../db/jsonDb.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard', requireAuth, async (req, res) => {
  const db = await readDb();
  const today = new Date().toISOString().slice(0, 10);
  const visibleHotelId = req.user.role === 'staff' ? req.user.employee?.hotelId : null;

  const employees = visibleHotelId ? db.employees.filter(item => item.hotelId === visibleHotelId) : db.employees;
  const shifts = visibleHotelId ? db.shifts.filter(item => item.hotelId === visibleHotelId) : db.shifts;
  const tasks = visibleHotelId ? db.tasks.filter(item => item.hotelId === visibleHotelId) : db.tasks;
  const absences = db.absenceRequests.filter(item => employees.some(employee => employee.id === item.employeeId));

  const shiftsToday = shifts.filter(item => item.startsAt.slice(0, 10) === today);
  const openTasks = tasks.filter(item => ['open', 'in_progress'].includes(item.status));
  const activeEmployees = employees.filter(item => item.status === 'active');
  const pendingAbsences = absences.filter(item => item.status === 'pending');

  res.json({
    ok: true,
    data: {
      metrics: {
        employeesTotal: employees.length,
        activeEmployees: activeEmployees.length,
        shiftsToday: shiftsToday.length,
        openTasks: openTasks.length,
        pendingAbsences: pendingAbsences.length
      },
      latestShifts: shifts.slice(0, 5),
      latestTasks: tasks.slice(0, 5),
      hotels: db.hotels
    }
  });
});

export default router;
