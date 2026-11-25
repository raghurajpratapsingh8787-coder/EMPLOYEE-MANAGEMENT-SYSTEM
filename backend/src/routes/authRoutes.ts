import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getBootstrapStatus,
  setupWorkspace,
  login,
  refreshSession,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  updateMyProfile,
} from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { csrfOriginCheck } from '../middleware/security';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again shortly.' },
});

router.get('/bootstrap-status', asyncHandler(getBootstrapStatus));
router.post('/setup', authLimiter, csrfOriginCheck, asyncHandler(setupWorkspace));
router.post('/login', authLimiter, csrfOriginCheck, asyncHandler(login));
router.post('/refresh', csrfOriginCheck, asyncHandler(refreshSession));
router.post('/logout', csrfOriginCheck, asyncHandler(logout));
router.post('/forgot-password', authLimiter, csrfOriginCheck, asyncHandler(forgotPassword));
router.post('/reset-password', authLimiter, csrfOriginCheck, asyncHandler(resetPassword));

router.get('/me', requireAuth, asyncHandler(getMe));
router.put('/profile', requireAuth, asyncHandler(updateMyProfile));

export default router;
