const express = require('express');
const { validate } = require('../middlewares/validate');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { optionalAuth, requireAuth } = require('../middlewares/auth');
const {
  supportSchema,
  supportUpdateSchema,
  supportPublicQuerySchema,
  supportCustomerMessageSchema,
  supportAuthMessageSchema,
  listQuerySchema
} = require('./schemas');
const { getRequestContext } = require('../utils/requestContext');
const supportService = require('../services/support.service');

const router = express.Router();

router.post('/', optionalAuth, validate(supportSchema), asyncHandler(async (req, res) => {
  const ticket = await supportService.createTicket(req.body, req.user || null, getRequestContext(req));
  res.status(201).json({ success: true, data: { ticket } });
}));

router.get('/public/:id', validate(supportPublicQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const ticket = await supportService.getPublicTicket(req.params.id, req.query.accessToken);
  res.json({ success: true, data: { ticket } });
}));

router.post('/public/:id/messages', validate(supportCustomerMessageSchema), asyncHandler(async (req, res) => {
  const ticket = await supportService.addCustomerMessage(req.params.id, req.body, getRequestContext(req));
  res.status(201).json({ success: true, data: { ticket } });
}));

router.get('/', requireAuth, validate(listQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const items = await supportService.listTickets(req.user, req.query);
  res.json({ success: true, data: { items, total: items.length } });
}));


router.post('/:id/messages', requireAuth, validate(supportAuthMessageSchema), asyncHandler(async (req, res) => {
  const ticket = await supportService.addAuthenticatedCustomerMessage(req.params.id, req.body, req.user, getRequestContext(req));
  res.status(201).json({ success: true, data: { ticket } });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const ticket = await supportService.getTicket(req.params.id, req.user);
  res.json({ success: true, data: { ticket } });
}));

router.patch('/:id', requireAuth, validate(supportUpdateSchema), asyncHandler(async (req, res) => {
  const ticket = await supportService.updateTicket(req.params.id, req.body, req.user, getRequestContext(req));
  res.json({ success: true, data: { ticket } });
}));

module.exports = { supportRouter: router };
