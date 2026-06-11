const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { env } = require('./config/env');
const { rateLimit } = require('./middlewares/rateLimit');
const { notFound } = require('./middlewares/notFound');
const { errorHandler } = require('./middlewares/errorHandler');
const { healthRouter } = require('./routes/health.routes');
const { authRouter } = require('./routes/auth.routes');
const { hotelRouter } = require('./routes/hotel.routes');
const { bookingRouter } = require('./routes/booking.routes');
const { supportRouter } = require('./routes/support.routes');
const { auditRouter } = require('./routes/audit.routes');
const { integrationRouter } = require('./routes/integration.routes');

function createApp() {
  const app = express();
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);

  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(rateLimit({ windowMs: 60_000, limit: 240 }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.get('/api', (req, res) => {
    res.json({
      success: true,
      data: {
        name: 'Roomly API',
        version: '2.0.0',
        description: 'REST API для курсовой работы по бронированию отелей',
        endpoints: [
          '/api/health',
          '/api/hotels',
          '/api/bookings',
          '/api/support',
          '/api/auth',
          '/api/audit',
          '/api/integration/staff-status'
        ]
      }
    });
  });

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/hotels', hotelRouter);
  app.use('/api/bookings', bookingRouter);
  app.use('/api/support', supportRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/integration', integrationRouter);

  const frontendDir = path.resolve(env.FRONTEND_DIR);
  app.use(express.static(frontendDir, {
    extensions: ['html'],
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    }
  }));

  app.get(/^\/(?!api).*/, (req, res, next) => {
    res.sendFile(path.join(frontendDir, 'index.html'), (error) => {
      if (error) next();
    });
  });

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
