import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';
import type { UserRole } from '../utils/rbac';

export interface AuthContext {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  employeeId?: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  employeeId?: string;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      res.status(401).json({ error: 'Authentication token missing' });
      return;
    }

    const decoded = jwt.verify(token, env.jwtAccessSecret) as JwtPayload;
    const user = await User.findById(decoded.sub).lean();

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Account inactive or not found' });
      return;
    }

    req.auth = {
      userId: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      employeeId: user.employeeId ? user.employeeId.toString() : undefined,
    };

    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!allowedRoles.includes(req.auth.role)) {
      res.status(403).json({ error: 'Insufficient permissions for this action' });
      return;
    }
    next();
  };
}
