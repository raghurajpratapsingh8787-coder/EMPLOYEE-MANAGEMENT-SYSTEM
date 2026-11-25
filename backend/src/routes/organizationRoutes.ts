import { Router } from 'express';
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  listDesignations,
  createDesignation,
  updateDesignation,
  deleteDesignation,
} from '../controllers/organizationController';
import { requireAuth, requireRoles } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/departments', asyncHandler(listDepartments));
router.post('/departments', requireRoles('SUPER_ADMIN', 'HR_ADMIN'), asyncHandler(createDepartment));
router.put('/departments/:id', requireRoles('SUPER_ADMIN', 'HR_ADMIN'), asyncHandler(updateDepartment));
router.delete('/departments/:id', requireRoles('SUPER_ADMIN', 'HR_ADMIN'), asyncHandler(deleteDepartment));

router.get('/designations', asyncHandler(listDesignations));
router.post('/designations', requireRoles('SUPER_ADMIN', 'HR_ADMIN'), asyncHandler(createDesignation));
router.put('/designations/:id', requireRoles('SUPER_ADMIN', 'HR_ADMIN'), asyncHandler(updateDesignation));
router.delete('/designations/:id', requireRoles('SUPER_ADMIN', 'HR_ADMIN'), asyncHandler(deleteDesignation));

export default router;
