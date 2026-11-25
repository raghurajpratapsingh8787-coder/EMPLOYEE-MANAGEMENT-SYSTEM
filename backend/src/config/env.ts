import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Ephemeral in-memory fallback secrets when env secrets are not provided.
const fallbackAccessSecret = crypto.randomBytes(32).toString('hex');
const fallbackRefreshSecret = crypto.randomBytes(32).toString('hex');

const rawCorsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const defaultOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
  defaultOrigins.push(process.env.APP_URL.replace(/\/$/, ''));
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.APP_PORT || 3000),
  mongodbUri: process.env.MONGODB_URI?.trim() || '',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET?.trim() || fallbackAccessSecret,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET?.trim() || fallbackRefreshSecret,
  accessTokenTtl: '15m' as const,
  refreshTokenTtlDays: 7,
  allowedOrigins: Array.from(new Set([...defaultOrigins, ...rawCorsOrigins])),
};
