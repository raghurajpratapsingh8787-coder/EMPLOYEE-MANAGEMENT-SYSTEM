import { Router } from 'express';
import {
  listPerformanceReviews,
  createPerformanceReview,
  acknowledgePerformanceReview,
} from '../controllers/performanceController';
import { requireAuth, requireRoles } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(listPerformanceReviews));
router.post('/', requireRoles('SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'), asyncHandler(createPerformanceReview));
router.patch('/:id/acknowledge', asyncHandler(acknowledgePerformanceReview));

export default router;
