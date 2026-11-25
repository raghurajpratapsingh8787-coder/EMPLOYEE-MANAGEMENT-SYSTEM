import { Router } from 'express';
import {
  getDashboardOverview,
  listNotifications,
  markNotificationRead,
  listAuditLogs,
  listAdminUsers,
  createAdminUser,
  updateUserRoleOrStatus,
} from '../controllers/dashboardController';
import { requireAuth, requireRoles } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/overview', asyncHandler(getDashboardOverview));
router.get('/notifications', asyncHandler(listNotifications));
router.patch('/notifications/:id/read', asyncHandler(markNotificationRead));
router.get('/audit-logs', requireRoles('SUPER_ADMIN', 'HR_ADMIN'), asyncHandler(listAuditLogs));
router.get('/admin/users', requireRoles('SUPER_ADMIN'), asyncHandler(listAdminUsers));
router.post('/admin/users', requireRoles('SUPER_ADMIN'), asyncHandler(createAdminUser));
router.patch('/admin/users/:id', requireRoles('SUPER_ADMIN'), asyncHandler(updateUserRoleOrStatus));

export default router;
