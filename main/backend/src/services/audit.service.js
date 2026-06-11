const { db } = require('../db/jsonDb');
const { createError } = require('../utils/httpError');

async function listAuditLog(currentUser, query = {}) {
  if (!currentUser || currentUser.role !== 'admin') throw createError(403, 'Журнал действий доступен только администратору');
  const data = await db.read();
  let items = data.auditLog || [];
  if (query.event) items = items.filter((item) => item.event === query.event);
  if (query.actorRole) items = items.filter((item) => item.actorRole === query.actorRole);
  return items
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, Number(query.limit || 100));
}

module.exports = { listAuditLog };
