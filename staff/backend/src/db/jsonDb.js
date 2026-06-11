import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSeedData } from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../../data');
const dbPath = path.join(dataDir, 'db.json');
const backupsDir = path.join(dataDir, 'backups');

let operationQueue = Promise.resolve();

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function createBackupIfNeeded() {
  if (!(await fileExists(dbPath))) return;

  await fs.mkdir(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupsDir, `db-${stamp}.json`);
  await fs.copyFile(dbPath, backupPath);

  const files = (await fs.readdir(backupsDir))
    .filter(file => file.endsWith('.json'))
    .sort()
    .reverse();

  await Promise.all(files.slice(10).map(file => fs.rm(path.join(backupsDir, file), { force: true })));
}

export async function ensureDatabase() {
  await fs.mkdir(dataDir, { recursive: true });
  if (!(await fileExists(dbPath))) {
    const seed = createSeedData();
    await fs.writeFile(dbPath, JSON.stringify(seed, null, 2), 'utf8');
  }
}

export async function readDb() {
  await ensureDatabase();
  const raw = await fs.readFile(dbPath, 'utf8');
  return JSON.parse(raw);
}

export async function writeDb(data) {
  operationQueue = operationQueue.catch(() => {}).then(async () => {
    await ensureDatabase();
    await createBackupIfNeeded();
    const tmpPath = `${dbPath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmpPath, dbPath);
  });
  return operationQueue;
}

export async function updateDb(mutator) {
  let result;
  operationQueue = operationQueue.catch(() => {}).then(async () => {
    await ensureDatabase();
    const raw = await fs.readFile(dbPath, 'utf8');
    const data = JSON.parse(raw);
    result = await mutator(data);
    await createBackupIfNeeded();
    const tmpPath = `${dbPath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmpPath, dbPath);
  });
  await operationQueue;
  return result;
}

export function getDbPath() {
  return dbPath;
}
