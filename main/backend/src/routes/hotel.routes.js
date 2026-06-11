const express = require('express');
const { validate } = require('../middlewares/validate');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { optionalAuth, requireAuth, requireRole } = require('../middlewares/auth');
const { hotelQuerySchema, hotelCreateSchema, hotelUpdateSchema } = require('./schemas');
const { getRequestContext } = require('../utils/requestContext');
const hotelService = require('../services/hotel.service');

const router = express.Router();

router.get('/', optionalAuth, validate(hotelQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const query = { ...req.query };
  if (req.query.includeInactive && req.user?.role !== 'admin') query.includeInactive = false;
  const result = await hotelService.listHotels(query);
  res.json({ success: true, data: result });
}));

router.post('/', requireAuth, requireRole('admin'), validate(hotelCreateSchema), asyncHandler(async (req, res) => {
  const hotel = await hotelService.createHotel(req.body, getRequestContext(req));
  res.status(201).json({ success: true, data: { hotel } });
}));

router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const hotel = await hotelService.getHotelById(req.params.id, { includeInactive: req.user?.role === 'admin' });
  res.json({ success: true, data: { hotel } });
}));

router.patch('/:id', requireAuth, requireRole('admin'), validate(hotelUpdateSchema), asyncHandler(async (req, res) => {
  const hotel = await hotelService.updateHotel(req.params.id, req.body, getRequestContext(req));
  res.json({ success: true, data: { hotel } });
}));

router.delete('/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await hotelService.deleteHotel(req.params.id, getRequestContext(req));
  res.json({ success: true, data: result });
}));

router.get('/:id/recommendations', asyncHandler(async (req, res) => {
  const items = await hotelService.getRecommendations(req.params.id, req.query.limit || 4);
  res.json({ success: true, data: { items, total: items.length } });
}));

router.get('/:id/availability', asyncHandler(async (req, res) => {
  const { checkIn, checkOut } = req.query;
  const result = await hotelService.checkAvailability(req.params.id, checkIn, checkOut);
  res.json({ success: true, data: result });
}));

module.exports = { hotelRouter: router };
