import { Router } from 'express';
import {
  getAttendanceDashboard,
  getMonthlyAttendanceReport,
  upsertAttendance,
} from '../controllers/attendanceController';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/daily', asyncHandler(getAttendanceDashboard));
router.get('/monthly-report', asyncHandler(getMonthlyAttendanceReport));
router.post('/', asyncHandler(upsertAttendance));

export default router;
