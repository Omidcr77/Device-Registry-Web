import 'dotenv/config';

export const ENV = {
  PORT: parseInt(process.env.PORT || '5001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  JWT_SECRET: process.env.JWT_SECRET || 'change_me',
  STATUS_TICK_MS: parseInt(process.env.STATUS_TICK_MS || '15000', 10),};


