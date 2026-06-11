const express = require('express');
const { validate } = require('../middlewares/validate');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { requireAuth, requireRole } = require('../middlewares/auth');
const { auditQuerySchema } = require('./schemas');
const auditService = require('../services/audit.service');

const router = express.Router();

router.get('/', requireAuth, requireRole('admin'), validate(auditQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const items = await auditService.listAuditLog(req.user, req.query);
  res.json({ success: true, data: { items, total: items.length } });
}));

module.exports = { auditRouter: router };
