import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { ensureDatabase } from './db/jsonDb.js';
import { notFoundHandler, errorHandler } from './middleware/httpError.js';
import authRoutes from './routes/auth.routes.js';
import directoryRoutes from './routes/directory.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import employeesRoutes from './routes/employees.routes.js';
import shiftsRoutes from './routes/shifts.routes.js';
import tasksRoutes from './routes/tasks.routes.js';
import absenceRoutes from './routes/absence.routes.js';
import auditRoutes from './routes/audit.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import integrationRoutes from './routes/integration.routes.js';
import customerSupportRoutes from './routes/customerSupport.routes.js';
import bookingsRoutes from './routes/bookings.routes.js';
import mainAuditRoutes from './routes/mainAudit.routes.js';

export async function createApp() {
  await ensureDatabase();

  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || env.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env.nodeEnv === 'test' ? 'tiny' : 'dev'));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, status: 'ok', service: 'roomly-staff-management-api', version: '2.0.0' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api', directoryRoutes);
  app.use('/api', dashboardRoutes);
  app.use('/api/employees', employeesRoutes);
  app.use('/api/shifts', shiftsRoutes);
  app.use('/api/tasks', tasksRoutes);
  app.use('/api/bookings', bookingsRoutes);
  app.use('/api/absences', absenceRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/main-audit', mainAuditRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/customer-support', customerSupportRoutes);
  app.use('/api/integration', integrationRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
