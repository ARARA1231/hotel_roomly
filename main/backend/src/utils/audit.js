const crypto = require('crypto');

function requestMeta(context = {}) {
  return {
    ip: context.ip || null,
    userAgent: context.userAgent || null
  };
}

function addAuditEvent(data, event, context = {}, details = {}) {
  if (!Array.isArray(data.auditLog)) data.auditLog = [];
  data.auditLog.push({
    id: crypto.randomUUID(),
    event,
    actorId: context.user?.id || null,
    actorRole: context.user?.role || 'guest',
    details,
    ...requestMeta(context),
    createdAt: new Date().toISOString()
  });
}

module.exports = { addAuditEvent };
