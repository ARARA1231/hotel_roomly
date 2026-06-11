const fs = require('fs/promises');
const path = require('path');
const { env } = require('../config/env');

const defaultData = {
  meta: { version: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  users: [],
  hotels: [],
  bookings: [],
  supportTickets: [],
  auditLog: []
};

class JsonDb {
  constructor(filePath = env.DATA_FILE) {
    this.filePath = filePath;
    this.writeQueue = Promise.resolve();
  }

  async ensure() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch (_) {
      await this.atomicWrite(defaultData);
    }
  }

  async read() {
    await this.ensure();
    const raw = await fs.readFile(this.filePath, 'utf8');
    const parsed = raw.trim() ? JSON.parse(raw) : {};
    return this.normalize(parsed);
  }

  normalize(data) {
    return {
      ...defaultData,
      ...data,
      meta: { ...defaultData.meta, ...(data.meta || {}) },
      users: Array.isArray(data.users) ? data.users : [],
      hotels: Array.isArray(data.hotels) ? data.hotels : [],
      bookings: Array.isArray(data.bookings) ? data.bookings : [],
      supportTickets: Array.isArray(data.supportTickets) ? data.supportTickets : [],
      auditLog: Array.isArray(data.auditLog) ? data.auditLog : []
    };
  }

  async backupCurrentFile() {
    if (!env.BACKUP_ENABLED || env.NODE_ENV === 'test') return;
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      if (!raw.trim()) return;
      await fs.mkdir(env.BACKUP_DIR, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const target = path.join(env.BACKUP_DIR, `roomly-${stamp}.json`);
      await fs.writeFile(target, raw, 'utf8');

      const backups = (await fs.readdir(env.BACKUP_DIR))
        .filter((name) => name.startsWith('roomly-') && name.endsWith('.json'))
        .sort();
      const toDelete = backups.slice(0, Math.max(0, backups.length - env.BACKUP_LIMIT));
      await Promise.all(toDelete.map((name) => fs.unlink(path.join(env.BACKUP_DIR, name)).catch(() => null)));
    } catch (_) {
      // Ошибка резервного копирования не должна останавливать работу приложения.
    }
  }

  async atomicWrite(data) {
    const normalized = this.normalize(data);
    normalized.meta.updatedAt = new Date().toISOString();
    const tmpFile = `${this.filePath}.${process.pid}.tmp`;
    await fs.writeFile(tmpFile, JSON.stringify(normalized, null, 2), 'utf8');
    await fs.rename(tmpFile, this.filePath);
    return normalized;
  }

  async write(data) {
    this.writeQueue = this.writeQueue.then(async () => {
      await this.ensure();
      await this.backupCurrentFile();
      return this.atomicWrite(data);
    });
    return this.writeQueue;
  }

  async update(mutator) {
    this.writeQueue = this.writeQueue.then(async () => {
      await this.ensure();
      const data = await this.read();
      const result = await mutator(data);
      await this.backupCurrentFile();
      await this.atomicWrite(data);
      return result;
    });
    return this.writeQueue;
  }
}

module.exports = { db: new JsonDb(), JsonDb, defaultData };
