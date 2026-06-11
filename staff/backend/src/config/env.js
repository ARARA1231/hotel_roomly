export const env = {
  port: Number(process.env.PORT || process.env.STAFF_API_PORT || 3100),
  nodeEnv: process.env.NODE_ENV || 'development',
  tokenSecret: process.env.TOKEN_SECRET || 'roomly-staff-management-coursework-secret',
  mainRoomlyApiUrl: process.env.MAIN_ROOMLY_API_URL || 'http://127.0.0.1:3000/api',
  integrationToken: process.env.ROOMLY_INTEGRATION_TOKEN || 'roomly_coursework_integration_token',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:5173,http://localhost:5174')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
};
