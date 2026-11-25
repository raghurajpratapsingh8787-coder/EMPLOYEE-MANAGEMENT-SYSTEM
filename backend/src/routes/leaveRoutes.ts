import { Router } from 'express';
import {
  listLeaveRequests,
  getLeaveBalances,
  applyLeave,
  reviewLeaveRequest,
  cancelLeaveRequest,
} from '../controllers/leaveController';
import { requireAuth, requireRoles } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(listLeaveRequests));
router.get('/balances', asyncHandler(getLeaveBalances));
router.post('/', asyncHandler(applyLeave));
router.patch('/:id/review', requireRoles('SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'), asyncHandler(reviewLeaveRequest));
router.patch('/:id/cancel', asyncHandler(cancelLeaveRequest));

export default router;
