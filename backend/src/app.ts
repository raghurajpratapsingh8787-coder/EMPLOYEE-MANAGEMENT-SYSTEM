import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { noSqlSanitizer, errorHandler } from './middleware/security';
import authRoutes from './routes/authRoutes';
import employeeRoutes from './routes/employeeRoutes';
import organizationRoutes from './routes/organizationRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import leaveRoutes from './routes/leaveRoutes';
import payrollRoutes from './routes/payrollRoutes';
import performanceRoutes from './routes/performanceRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

export function createExpressApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }
        const normalized = origin.replace(/\/$/, '');
        if (
          env.allowedOrigins.includes(normalized) ||
          normalized.endsWith('.run.app')
        ) {
          return callback(null, true);
        }
        return callback(new Error('Origin not allowed by CORS policy'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(noSqlSanitizer);

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded. Please wait before retrying.' },
  });
  app.use('/api', apiLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/employees', employeeRoutes);
  app.use('/api/organization', organizationRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/leave', leaveRoutes);
  app.use('/api/payroll', payrollRoutes);
  app.use('/api/performance', performanceRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  app.use(errorHandler);

  return app;
}
