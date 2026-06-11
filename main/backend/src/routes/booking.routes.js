const express = require('express');
const { validate } = require('../middlewares/validate');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { optionalAuth, requireAuth, requireRole } = require('../middlewares/auth');
const { bookingSchema, bookingUpdateSchema, listQuerySchema } = require('./schemas');
const { getRequestContext } = require('../utils/requestContext');
const bookingService = require('../services/booking.service');

const router = express.Router();

router.get('/', requireAuth, validate(listQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const items = await bookingService.listBookings(req.user, req.query);
  res.json({ success: true, data: { items, total: items.length } });
}));

router.post('/', requireAuth, requireRole('user', 'admin'), validate(bookingSchema), asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking(req.body, req.user, getRequestContext(req));
  res.status(201).json({ success: true, data: { booking } });
}));

router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const booking = await bookingService.getBooking(req.params.id, req.user || null, req.query.accessToken);
  res.json({ success: true, data: { booking } });
}));

router.patch('/:id', optionalAuth, validate(bookingUpdateSchema), asyncHandler(async (req, res) => {
  const booking = await bookingService.updateBooking(
    req.params.id,
    req.body,
    req.user || null,
    req.body?.accessToken || req.query.accessToken,
    getRequestContext(req)
  );
  res.json({ success: true, data: { booking } });
}));

router.patch('/:id/cancel', optionalAuth, asyncHandler(async (req, res) => {
  const booking = await bookingService.cancelBooking(req.params.id, req.user || null, req.body?.accessToken || req.query.accessToken, getRequestContext(req));
  res.json({ success: true, data: { booking } });
}));

router.delete('/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const booking = await bookingService.deleteBooking(req.params.id, req.user, getRequestContext(req));
  res.json({ success: true, data: { booking } });
}));

module.exports = { bookingRouter: router };
