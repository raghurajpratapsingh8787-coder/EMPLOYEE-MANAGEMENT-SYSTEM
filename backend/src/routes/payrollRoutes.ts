import { Router } from 'express';
import {
  listPayroll,
  getMyPayslips,
  createOrUpdatePayroll,
  generateMonthlyBatchPayroll,
  updatePayrollStatus,
} from '../controllers/payrollController';
import { requireAuth, requireRoles } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/my', asyncHandler(getMyPayslips));
router.get('/', requireRoles('SUPER_ADMIN', 'HR_ADMIN'), asyncHandler(listPayroll));
router.post('/', requireRoles('SUPER_ADMIN', 'HR_ADMIN'), asyncHandler(createOrUpdatePayroll));
router.post('/generate-batch', requireRoles('SUPER_ADMIN', 'HR_ADMIN'), asyncHandler(generateMonthlyBatchPayroll));
router.patch('/:id/status', requireRoles('SUPER_ADMIN', 'HR_ADMIN'), asyncHandler(updatePayrollStatus));

export default router;
