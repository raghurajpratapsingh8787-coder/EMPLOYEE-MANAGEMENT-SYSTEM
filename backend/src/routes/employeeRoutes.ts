import { Router } from 'express';
import multer from 'multer';
import {
  listEmployees,
  exportEmployeesCsv,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  bulkUpdateEmployeeStatus,
  uploadEmployeeAvatar,
  getEmployeeAvatar,
} from '../controllers/employeeController';
import { requireAuth, requireRoles } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
});

router.use(requireAuth);

router.get('/', asyncHandler(listEmployees));
router.get('/export', requireRoles('SUPER_ADMIN', 'HR_ADMIN'), asyncHandler(exportEmployeesCsv));
router.post('/bulk-status', requireRoles('SUPER_ADMIN', 'HR_ADMIN'), asyncHandler(bulkUpdateEmployeeStatus));
router.get('/:id', asyncHandler(getEmployeeById));
router.post('/', requireRoles('SUPER_ADMIN', 'HR_ADMIN'), asyncHandler(createEmployee));
router.put('/:id', requireRoles('SUPER_ADMIN', 'HR_ADMIN'), asyncHandler(updateEmployee));
router.delete('/:id', requireRoles('SUPER_ADMIN', 'HR_ADMIN'), asyncHandler(deleteEmployee));
router.post('/:id/avatar', upload.single('avatar'), asyncHandler(uploadEmployeeAvatar));
router.get('/:id/avatar', asyncHandler(getEmployeeAvatar));

export default router;
