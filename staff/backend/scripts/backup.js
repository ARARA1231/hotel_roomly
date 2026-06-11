import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDatabase, getDbPath } from '../src/db/jsonDb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backupDir = path.resolve(__dirname, '../data/backups');

await ensureDatabase();
await fs.mkdir(backupDir, { recursive: true });
const stamp = new Date().toISOString().replaceAll(':', '-');
const target = path.join(backupDir, `db-backup-${stamp}.json`);
await fs.copyFile(getDbPath(), target);
console.log(`Backup created: ${target}`);
