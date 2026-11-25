import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { env } from '../config/env';
import { User } from '../models/User';
import { Employee } from '../models/Employee';
import { Session } from '../models/Session';
import {
  setupWorkspaceSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../validators/schemas';
import { AppError } from '../middleware/security';
import { recordAuditLog } from '../services/auditService';
import { seedEnterpriseWorkspace } from '../services/seedService';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user: {
  _id: { toString(): string };
  email: string;
  role: string;
  employeeId?: { toString(): string } | null;
}): string {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      employeeId: user.employeeId ? user.employeeId.toString() : undefined,
    },
    env.jwtAccessSecret,
    { expiresIn: env.accessTokenTtl }
  );
}

function setRefreshCookie(res: Response, refreshToken: string): void {
  const maxAgeMs = env.refreshTokenTtlDays * 24 * 60 * 60 * 1000;
  res.cookie('calibre_refresh', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    partitioned: true,
    maxAge: maxAgeMs,
    path: '/api/auth',
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie('calibre_refresh', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    partitioned: true,
    path: '/api/auth',
  });
}

async function createSessionForUser(userId: string, req: Request): Promise<string> {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

  await Session.create({
    userId,
    tokenHash: hashToken(rawToken),
    expiresAt,
    userAgent: req.headers['user-agent']?.slice(0, 200),
    ipAddress: req.ip,
  });

  return rawToken;
}

export async function getBootstrapStatus(_req: Request, res: Response): Promise<void> {
  const count = await User.countDocuments();
  res.json({ needsSetup: count === 0 });
}

export async function setupWorkspace(req: Request, res: Response): Promise<void> {
  const parsed = setupWorkspaceSchema.parse(req.body);

  const existingCount = await User.countDocuments();
  if (existingCount > 0) {
    throw new AppError(403, 'Workspace is already initialized. Please sign in.');
  }

  const passwordHash = await bcrypt.hash(parsed.password, 12);
  const adminUser = await User.create({
    fullName: parsed.fullName,
    email: parsed.email,
    passwordHash,
    role: 'SUPER_ADMIN',
    isActive: true,
    lastLogin: new Date(),
  });

  if (parsed.seedSampleData) {
    await seedEnterpriseWorkspace({
      adminUserId: adminUser._id.toString(),
      adminFullName: parsed.fullName,
      adminEmail: parsed.email,
    });
  }

  const refreshedUser = await User.findById(adminUser._id).lean();
  const accessToken = signAccessToken(refreshedUser!);
  const refreshToken = await createSessionForUser(adminUser._id.toString(), req);
  setRefreshCookie(res, refreshToken);

  await recordAuditLog({
    actorUserId: adminUser._id.toString(),
    actorEmail: adminUser.email,
    actorRole: adminUser.role,
    action: 'WORKSPACE_SETUP',
    resourceType: 'User',
    resourceId: adminUser._id.toString(),
    summary: 'Initialized enterprise HR workspace and Super Admin account',
    ipAddress: req.ip,
  });

  res.status(201).json({
    accessToken,
    user: {
      id: refreshedUser!._id.toString(),
      email: refreshedUser!.email,
      fullName: refreshedUser!.fullName,
      role: refreshedUser!.role,
      employeeId: refreshedUser!.employeeId?.toString(),
    },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new AppError(403, 'Account is disabled. Contact your administrator.');
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    throw new AppError(429, 'Account temporarily locked due to failed login attempts. Try again later.');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const attempts = (user.failedLoginAttempts || 0) + 1;
    const update: Record<string, unknown> = { failedLoginAttempts: attempts };
    if (attempts >= 5) {
      update.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await User.findByIdAndUpdate(user._id, update);
    throw new AppError(401, 'Invalid email or password');
  }

  await User.findByIdAndUpdate(user._id, {
    failedLoginAttempts: 0,
    lockUntil: null,
    lastLogin: new Date(),
  });

  const accessToken = signAccessToken(user);
  const refreshToken = await createSessionForUser(user._id.toString(), req);
  setRefreshCookie(res, refreshToken);

  await recordAuditLog({
    actorUserId: user._id.toString(),
    actorEmail: user.email,
    actorRole: user.role,
    action: 'LOGIN',
    resourceType: 'Session',
    summary: 'User authenticated successfully',
    ipAddress: req.ip,
  });

  res.json({
    accessToken,
    user: {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      employeeId: user.employeeId?.toString(),
    },
  });
}

export async function refreshSession(req: Request, res: Response): Promise<void> {
  const rawToken = req.cookies?.calibre_refresh;
  if (!rawToken || typeof rawToken !== 'string') {
    throw new AppError(401, 'Refresh session missing');
  }

  const tokenHash = hashToken(rawToken);
  const existingSession = await Session.findOne({
    tokenHash,
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });

  if (!existingSession) {
    clearRefreshCookie(res);
    throw new AppError(401, 'Session expired or revoked');
  }

  const user = await User.findById(existingSession.userId);
  if (!user || !user.isActive) {
    clearRefreshCookie(res);
    throw new AppError(401, 'Account inactive or not found');
  }

  // Rotate refresh token: revoke old session and issue a new one
  existingSession.revokedAt = new Date();
  await existingSession.save();

  const newRefreshToken = await createSessionForUser(user._id.toString(), req);
  setRefreshCookie(res, newRefreshToken);

  const accessToken = signAccessToken(user);
  res.json({
    accessToken,
    user: {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      employeeId: user.employeeId?.toString(),
    },
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const rawToken = req.cookies?.calibre_refresh;
  if (rawToken && typeof rawToken === 'string') {
    await Session.findOneAndUpdate(
      { tokenHash: hashToken(rawToken) },
      { revokedAt: new Date() }
    );
  }
  clearRefreshCookie(res);

  if (req.auth) {
    await recordAuditLog({
      actorUserId: req.auth.userId,
      actorEmail: req.auth.email,
      actorRole: req.auth.role,
      action: 'LOGOUT',
      resourceType: 'Session',
      summary: 'User signed out and revoked active session',
      ipAddress: req.ip,
    });
  }

  res.json({ message: 'Signed out successfully' });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = forgotPasswordSchema.parse(req.body);
  const user = await User.findOne({ email });

  if (user) {
    const rawReset = crypto.randomBytes(24).toString('hex');
    user.resetTokenHash = hashToken(rawReset);
    user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    await recordAuditLog({
      actorUserId: user._id.toString(),
      actorEmail: user.email,
      actorRole: user.role,
      action: 'PASSWORD_RESET_REQUESTED',
      resourceType: 'User',
      resourceId: user._id.toString(),
      summary: 'Password reset token generated',
      ipAddress: req.ip,
    });
  }

  // Always return neutral response to prevent account enumeration
  res.json({
    message:
      'If an account exists for that email address, a password reset instruction has been queued. Contact your Super Admin if immediate credential reset is required.',
  });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, newPassword } = resetPasswordSchema.parse(req.body);
  const tokenHash = hashToken(token);

  const user = await User.findOne({
    resetTokenHash: tokenHash,
    resetTokenExpires: { $gt: new Date() },
  }).select('+resetTokenHash +resetTokenExpires');

  if (!user) {
    throw new AppError(400, 'Invalid or expired password reset token');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  // Revoke all existing sessions
  await Session.updateMany({ userId: user._id, revokedAt: { $exists: false } }, { revokedAt: new Date() });

  await recordAuditLog({
    actorUserId: user._id.toString(),
    actorEmail: user.email,
    actorRole: user.role,
    action: 'PASSWORD_RESET_COMPLETED',
    resourceType: 'User',
    resourceId: user._id.toString(),
    summary: 'Password reset completed and prior sessions revoked',
    ipAddress: req.ip,
  });

  res.json({ message: 'Password updated. You can now sign in with your new password.' });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new AppError(401, 'Not authenticated');
  }

  const user = await User.findById(req.auth.userId).lean();
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  let employee = null;
  if (user.employeeId) {
    employee = await Employee.findById(user.employeeId)
      .populate('departmentId', 'name code')
      .populate('designationId', 'name level')
      .lean();
  }

  res.json({
    user: {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      employeeId: user.employeeId?.toString(),
      lastLogin: user.lastLogin,
    },
    employee,
  });
}

export async function updateMyProfile(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw new AppError(401, 'Not authenticated');
  }

  const payload = updateProfileSchema.parse(req.body);
  const user = await User.findById(req.auth.userId).select('+passwordHash');
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  if (payload.newPassword) {
    if (!payload.currentPassword) {
      throw new AppError(400, 'Current password is required to set a new password');
    }
    const matches = await bcrypt.compare(payload.currentPassword, user.passwordHash);
    if (!matches) {
      throw new AppError(400, 'Current password is incorrect');
    }
    user.passwordHash = await bcrypt.hash(payload.newPassword, 12);
  }

  if (payload.fullName) {
    user.fullName = payload.fullName;
  }
  await user.save();

  if (user.employeeId) {
    const empUpdates: Record<string, unknown> = {};
    if (payload.fullName) empUpdates.fullName = payload.fullName;
    if (payload.phone) empUpdates.phone = payload.phone;
    if (payload.address) empUpdates.address = payload.address;
    if (payload.city) empUpdates.city = payload.city;
    if (payload.state) empUpdates.state = payload.state;

    if (Object.keys(empUpdates).length > 0) {
      await Employee.findByIdAndUpdate(user.employeeId, empUpdates);
    }
  }

  await recordAuditLog({
    actorUserId: user._id.toString(),
    actorEmail: user.email,
    actorRole: user.role,
    action: 'PROFILE_UPDATED',
    resourceType: 'User',
    resourceId: user._id.toString(),
    summary: 'User updated own profile settings',
    ipAddress: req.ip,
  });

  res.json({
    message: 'Profile updated successfully',
    user: {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      employeeId: user.employeeId?.toString(),
    },
  });
}
