import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { sanitizeNoSqlPayload } from '../utils/securityHelpers';
import { env } from '../config/env';

export class AppError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export function noSqlSanitizer(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeNoSqlPayload(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    const cleanQuery = sanitizeNoSqlPayload(req.query);
    for (const key of Object.keys(req.query)) {
      if (!(key in cleanQuery)) {
        delete req.query[key];
      }
    }
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeNoSqlPayload(req.params);
  }
  next();
}

export function csrfOriginCheck(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  const origin = req.headers.origin;
  const xRequestedWith = req.headers['x-requested-with'];

  if (origin) {
    const normalized = origin.replace(/\/$/, '');
    const hostHeader = req.headers['x-forwarded-host'] || req.headers.host;
    const expectedSameOrigin = hostHeader ? `https://${hostHeader}` : '';
    const expectedHttpOrigin = hostHeader ? `http://${hostHeader}` : '';

    if (
      env.allowedOrigins.includes(normalized) ||
      normalized === expectedSameOrigin ||
      normalized === expectedHttpOrigin
    ) {
      return next();
    }
    res.status(403).json({ error: 'Cross-origin request rejected' });
    return;
  }

  // Allow non-browser / same-origin SPA calls carrying custom header
  if (xRequestedWith === 'XMLHttpRequest' || req.headers.authorization?.startsWith('Bearer ')) {
    return next();
  }

  next();
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => `${i.path.join('.') || 'field'}: ${i.message}`);
    res.status(400).json({ error: 'Validation failed', details: issues });
    return;
  }

  if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: number }).code === 11000) {
    const keyValue = (err as { keyValue?: Record<string, unknown> }).keyValue;
    const dupField = keyValue ? Object.keys(keyValue).join(', ') : 'record';
    res.status(409).json({ error: `Duplicate value for ${dupField}. Must be unique.` });
    return;
  }

  if (err instanceof Error && err.name === 'CastError') {
    res.status(400).json({ error: 'Invalid resource identifier format' });
    return;
  }

  if (err instanceof Error && err.message.includes('File too large')) {
    res.status(413).json({ error: 'Uploaded file exceeds maximum allowed size (2 MB)' });
    return;
  }

  console.error('Unhandled API error:', err instanceof Error ? err.message : 'Unknown error');
  res.status(500).json({ error: 'Internal server error' });
}
