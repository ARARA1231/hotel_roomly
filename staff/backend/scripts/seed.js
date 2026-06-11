import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSeedData } from '../src/db/seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../data');
const dbPath = path.join(dataDir, 'db.json');

await fs.mkdir(dataDir, { recursive: true });
await fs.writeFile(dbPath, JSON.stringify(createSeedData(), null, 2), 'utf8');
console.log(`Database seeded: ${dbPath}`);
