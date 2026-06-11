const express = require('express');
const { env } = require('../config/env');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { requireAuth, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { createError } = require('../utils/httpError');
const { getRequestContext } = require('../utils/requestContext');
const {
  listQuerySchema,
  supportStaffMessageSchema,
  supportIntegrationStatusSchema,
  bookingIntegrationStatusSchema,
  auditQuerySchema
} = require('./schemas');
const bookingService = require('../services/booking.service');
const auditService = require('../services/audit.service');
const supportService = require('../services/support.service');

const router = express.Router();

function requireIntegrationToken(req, _res, next) {
  const token = req.headers['x-integration-token'];
  if (!env.ROOMLY_INTEGRATION_TOKEN || token !== env.ROOMLY_INTEGRATION_TOKEN) {
    return next(createError(401, 'Некорректный токен интеграции'));
  }
  next();
}

router.get('/staff-status', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`${env.STAFF_API_URL}/health`, { signal: controller.signal });
    const body = await response.json().catch(() => null);
    res.json({
      success: true,
      data: {
        connected: response.ok,
        staffApiUrl: env.STAFF_API_URL,
        response: body
      }
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        connected: false,
        staffApiUrl: env.STAFF_API_URL,
        message: error.name === 'AbortError' ? 'Staff API не ответил вовремя' : 'Staff API недоступен'
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}));


router.get('/bookings', requireIntegrationToken, validate(listQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const integrationAdmin = { id: 'staff-api', name: 'Roomly Staff API', email: 'staff-api@roomly.local', role: 'admin' };
  const items = await bookingService.listBookings(integrationAdmin, req.query);
  res.json({ success: true, data: { items, total: items.length } });
}));

router.patch('/bookings/:id/status', requireIntegrationToken, validate(bookingIntegrationStatusSchema), asyncHandler(async (req, res) => {
  const integrationAdmin = { id: 'staff-api', name: 'Roomly Staff API', email: 'staff-api@roomly.local', role: 'admin' };
  const booking = await bookingService.updateBooking(
    req.params.id,
    { status: req.body.status },
    integrationAdmin,
    null,
    { ...getRequestContext(req), user: integrationAdmin }
  );
  res.json({ success: true, data: { booking } });
}));

router.get('/audit-log', requireIntegrationToken, validate(auditQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const integrationAdmin = { id: 'staff-api', name: 'Roomly Staff API', email: 'staff-api@roomly.local', role: 'admin' };
  const items = await auditService.listAuditLog(integrationAdmin, req.query);
  res.json({ success: true, data: { items, total: items.length } });
}));

router.get('/support-tickets', requireIntegrationToken, validate(listQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const items = await supportService.listTicketsForIntegration(req.query);
  res.json({ success: true, data: { items, total: items.length } });
}));

router.post('/support-tickets/:id/messages', requireIntegrationToken, validate(supportStaffMessageSchema), asyncHandler(async (req, res) => {
  const ticket = await supportService.addStaffMessage(req.params.id, req.body, getRequestContext(req));
  res.status(201).json({ success: true, data: { ticket } });
}));

router.patch('/support-tickets/:id/status', requireIntegrationToken, validate(supportIntegrationStatusSchema), asyncHandler(async (req, res) => {
  const ticket = await supportService.updateTicketFromIntegration(req.params.id, req.body, getRequestContext(req));
  res.json({ success: true, data: { ticket } });
}));

module.exports = { integrationRouter: router };
