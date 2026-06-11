const express = require('express');
const { validate } = require('../middlewares/validate');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { requireAuth, requireRole } = require('../middlewares/auth');
const { registerSchema, loginSchema, userUpdateSchema, adminUserUpdateSchema, listQuerySchema } = require('./schemas');
const { getRequestContext } = require('../utils/requestContext');
const authService = require('../services/auth.service');

const router = express.Router();

router.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, getRequestContext(req));
  res.status(201).json({ success: true, data: result });
}));

router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, getRequestContext(req));
  res.json({ success: true, data: result });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: authService.publicUser(req.user) } });
}));

router.patch('/me', requireAuth, validate(userUpdateSchema), asyncHandler(async (req, res) => {
  const user = await authService.updateUser(req.user.id, req.body, req.user, getRequestContext(req));
  res.json({ success: true, data: { user } });
}));

router.get('/users', requireAuth, requireRole('admin'), validate(listQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const items = await authService.listUsers(req.user, req.query);
  res.json({ success: true, data: { items, total: items.length } });
}));

router.patch('/users/:id', requireAuth, requireRole('admin'), validate(adminUserUpdateSchema), asyncHandler(async (req, res) => {
  const user = await authService.updateUser(req.params.id, req.body, req.user, getRequestContext(req));
  res.json({ success: true, data: { user } });
}));

module.exports = { authRouter: router };
