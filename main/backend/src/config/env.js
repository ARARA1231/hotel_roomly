const path = require('path');
const dotenv = require('dotenv');

// Поддерживаются оба варианта: .env в корне проекта и backend/.env.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),
  JWT_SECRET: process.env.JWT_SECRET || 'roomly_dev_secret_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:3000,http://localhost:3000',
  DATA_FILE: process.env.DATA_FILE || path.resolve(process.cwd(), 'backend/data/db.json'),
  BACKUP_DIR: process.env.BACKUP_DIR || path.resolve(process.cwd(), 'backend/data/backups'),
  BACKUP_ENABLED: process.env.BACKUP_ENABLED !== 'false',
  BACKUP_LIMIT: Number(process.env.BACKUP_LIMIT || 20),
  FRONTEND_DIR: process.env.FRONTEND_DIR || process.cwd(),
  STAFF_API_URL: process.env.STAFF_API_URL || 'http://127.0.0.1:3100/api',
  ROOMLY_INTEGRATION_TOKEN: process.env.ROOMLY_INTEGRATION_TOKEN || 'roomly_coursework_integration_token'
};

module.exports = { env };
