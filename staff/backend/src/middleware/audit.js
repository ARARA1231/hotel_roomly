import { updateDb } from '../db/jsonDb.js';
import { createId, nowIso } from '../utils/id.js';

export async function writeAudit({ req, action, entity, entityId, meta = {} }) {
  await updateDb(db => {
    db.audit.unshift({
      id: createId('audit'),
      userId: req.user?.id || 'anonymous',
      action,
      entity,
      entityId,
      at: nowIso(),
      ip: req.ip,
      meta
    });
    db.audit = db.audit.slice(0, 500);
  });
}
