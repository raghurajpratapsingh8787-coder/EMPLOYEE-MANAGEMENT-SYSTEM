import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { PerformanceReview } from '../models/PerformanceReview';
import { Employee } from '../models/Employee';
import { performanceCreateSchema } from '../validators/schemas';
import { AppError } from '../middleware/security';
import { isHrOrAdmin } from '../utils/rbac';
import { recordAuditLog } from '../services/auditService';

export async function listPerformanceReviews(req: Request, res: Response): Promise<void> {
  const filter: Record<string, unknown> = {};

  if (req.auth!.role === 'EMPLOYEE') {
    if (!req.auth!.employeeId) {
      res.json({ items: [] });
      return;
    }
    filter.employeeId = req.auth!.employeeId;
    filter.status = { $ne: 'DRAFT' };
  } else if (req.auth!.role === 'MANAGER' && req.auth!.employeeId) {
    const team = await Employee.find({
      $or: [{ reportingManagerId: req.auth!.employeeId }, { _id: req.auth!.employeeId }],
    })
      .select('_id')
      .lean();
    filter.employeeId = { $in: team.map((t) => t._id) };
  }

  const items = await PerformanceReview.find(filter)
    .populate({
      path: 'employeeId',
      select: 'employeeId fullName avatarUrl departmentId designationId',
      populate: [
        { path: 'departmentId', select: 'name code' },
        { path: 'designationId', select: 'name' },
      ],
    })
    .populate('reviewerId', 'fullName employeeId')
    .sort({ reviewDate: -1, createdAt: -1 })
    .lean();

  res.json({ items });
}

export async function createPerformanceReview(req: Request, res: Response): Promise<void> {
  const payload = performanceCreateSchema.parse(req.body);
  const targetEmployee = await Employee.findById(payload.employeeId).lean();
  if (!targetEmployee) {
    throw new AppError(404, 'Employee not found');
  }

  if (
    !isHrOrAdmin(req.auth!.role) &&
    !(
      req.auth!.role === 'MANAGER' &&
      req.auth!.employeeId &&
      targetEmployee.reportingManagerId?.toString() === req.auth!.employeeId
    )
  ) {
    throw new AppError(403, 'You can only create performance reviews for your direct reports');
  }

  const reviewerEmployeeId = req.auth!.employeeId || targetEmployee.reportingManagerId?.toString() || payload.employeeId;

  const review = await PerformanceReview.create({
    ...payload,
    reviewerId: reviewerEmployeeId,
  });

  await recordAuditLog({
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    actorRole: req.auth!.role,
    action: 'PERFORMANCE_REVIEW_CREATED',
    resourceType: 'PerformanceReview',
    resourceId: review._id.toString(),
    summary: `Submitted ${payload.reviewPeriod} performance review for ${targetEmployee.fullName}`,
    ipAddress: req.ip,
  });

  res.status(201).json({ review });
}

export async function acknowledgePerformanceReview(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid review ID');
  }

  const review = await PerformanceReview.findById(id);
  if (!review) {
    throw new AppError(404, 'Performance review not found');
  }

  if (req.auth!.employeeId !== review.employeeId.toString() && !isHrOrAdmin(req.auth!.role)) {
    throw new AppError(403, 'Not authorized to acknowledge this performance review');
  }

  review.status = 'ACKNOWLEDGED';
  await review.save();

  res.json({ review });
}
