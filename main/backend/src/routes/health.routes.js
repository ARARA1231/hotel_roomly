const express = require('express');
const { db } = require('../db/jsonDb');
const { asyncHandler } = require('../middlewares/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const data = await db.read();
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'Roomly API',
      uptime: process.uptime(),
      hotels: data.hotels.length,
      activeHotels: data.hotels.filter((hotel) => hotel.status === 'active').length,
      users: data.users.length,
      bookings: data.bookings.length,
      supportTickets: data.supportTickets.length,
      auditEvents: data.auditLog.length,
      time: new Date().toISOString()
    }
  });
}));

module.exports = { healthRouter: router };
