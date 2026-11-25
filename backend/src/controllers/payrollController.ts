import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Payroll } from '../models/Payroll';
import { Employee } from '../models/Employee';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { payrollCreateSchema, payrollStatusSchema } from '../validators/schemas';
import { calculatePayroll, summarizePayrollBatch } from '../utils/payrollCalculator';
import { AppError } from '../middleware/security';
import { recordAuditLog } from '../services/auditService';

export async function listPayroll(req: Request, res: Response): Promise<void> {
  const periodMonth = req.query.month ? Number(req.query.month) : undefined;
  const periodYear = req.query.year ? Number(req.query.year) : undefined;
  const status = typeof req.query.status === 'string' ? req.query.status : '';

  const filter: Record<string, unknown> = {};
  if (periodMonth && periodMonth >= 1 && periodMonth <= 12) filter.periodMonth = periodMonth;
  if (periodYear && periodYear >= 2020) filter.periodYear = periodYear;
  if (status && ['DRAFT', 'APPROVED', 'PAID'].includes(status)) filter.status = status;

  const items = await Payroll.find(filter)
    .populate({
      path: 'employeeId',
      select: 'employeeId fullName email avatarUrl departmentId designationId',
      populate: [
        { path: 'departmentId', select: 'name code' },
        { path: 'designationId', select: 'name' },
      ],
    })
    .populate('approvedBy', 'fullName')
    .sort({ periodYear: -1, periodMonth: -1, createdAt: -1 })
    .lean();

  const summary = summarizePayrollBatch(
    items.map((i) => ({
      basicSalary: i.basicSalary,
      allowances: i.allowances,
      bonus: i.bonus,
      deductions: i.deductions,
      grossSalary: i.grossSalary,
      netSalary: i.netSalary,
    }))
  );

  res.json({ items, summary });
}

export async function getMyPayslips(req: Request, res: Response): Promise<void> {
  if (!req.auth!.employeeId) {
    res.json({ items: [], summary: { totalGross: 0, totalNet: 0, totalDeductions: 0, count: 0 } });
    return;
  }

  const items = await Payroll.find({
    employeeId: req.auth!.employeeId,
    status: { $in: ['APPROVED', 'PAID'] },
  })
    .populate({
      path: 'employeeId',
      select: 'employeeId fullName email departmentId designationId',
      populate: [
        { path: 'departmentId', select: 'name code' },
        { path: 'designationId', select: 'name' },
      ],
    })
    .sort({ periodYear: -1, periodMonth: -1 })
    .lean();

  res.json({ items });
}

export async function createOrUpdatePayroll(req: Request, res: Response): Promise<void> {
  const payload = payrollCreateSchema.parse(req.body);

  const employee = await Employee.findById(payload.employeeId).select('_id fullName').lean();
  if (!employee) {
    throw new AppError(404, 'Employee not found');
  }

  const calc = calculatePayroll({
    basicSalary: payload.basicSalary,
    allowances: payload.allowances,
    bonus: payload.bonus,
    deductions: payload.deductions,
  });

  const existing = await Payroll.findOne({
    employeeId: payload.employeeId,
    periodMonth: payload.periodMonth,
    periodYear: payload.periodYear,
  });

  if (existing && existing.status === 'PAID') {
    throw new AppError(409, 'Paid payroll record cannot be overwritten');
  }

  let record;
  if (existing) {
    existing.basicSalary = calc.basicSalary;
    existing.allowances = calc.allowances;
    existing.bonus = calc.bonus;
    existing.deductions = calc.deductions;
    existing.grossSalary = calc.grossSalary;
    existing.netSalary = calc.netSalary;
    existing.currency = payload.currency;
    if (payload.configurationLabel) existing.configurationLabel = payload.configurationLabel;
    if (payload.notes !== undefined) existing.notes = payload.notes;
    record = await existing.save();
  } else {
    record = await Payroll.create({
      employeeId: payload.employeeId,
      periodMonth: payload.periodMonth,
      periodYear: payload.periodYear,
      ...calc,
      currency: payload.currency,
      configurationLabel:
        payload.configurationLabel ||
        'Configurable Enterprise Payroll Formula (No statutory tax auto-applied)',
      notes: payload.notes,
      status: 'DRAFT',
    });
  }

  await recordAuditLog({
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    actorRole: req.auth!.role,
    action: existing ? 'PAYROLL_UPDATED' : 'PAYROLL_GENERATED',
    resourceType: 'Payroll',
    resourceId: record._id.toString(),
    summary: `${existing ? 'Updated' : 'Generated'} payroll record for ${employee.fullName} (${payload.periodYear}-${String(payload.periodMonth).padStart(2, '0')})`,
    ipAddress: req.ip,
  });

  res.status(existing ? 200 : 201).json({ record });
}

export async function generateMonthlyBatchPayroll(req: Request, res: Response): Promise<void> {
  const periodMonth = Number(req.body?.periodMonth || new Date().getUTCMonth() + 1);
  const periodYear = Number(req.body?.periodYear || new Date().getUTCFullYear());
  const allowanceRatePct = Number(req.body?.allowanceRatePct ?? 12);
  const deductionRatePct = Number(req.body?.deductionRatePct ?? 8);

  if (
    periodMonth < 1 ||
    periodMonth > 12 ||
    periodYear < 2020 ||
    allowanceRatePct < 0 ||
    allowanceRatePct > 100 ||
    deductionRatePct < 0 ||
    deductionRatePct > 100
  ) {
    throw new AppError(400, 'Invalid batch payroll period or configuration rates');
  }

  const activeEmployees = await Employee.find({ status: { $in: ['ACTIVE', 'ON_LEAVE'] } }).lean();
  const existingPayrolls = await Payroll.find({ periodMonth, periodYear }).select('employeeId').lean();
  const existingEmpIds = new Set(existingPayrolls.map((p) => String(p.employeeId)));

  const toCreate = activeEmployees
    .filter((emp) => !existingEmpIds.has(String(emp._id)))
    .map((emp) => {
      const calc = calculatePayroll({
        basicSalary: emp.salary,
        allowances: Math.round(emp.salary * (allowanceRatePct / 100)),
        bonus: 0,
        deductions: Math.round(emp.salary * (deductionRatePct / 100)),
      });
      return {
        employeeId: emp._id,
        periodMonth,
        periodYear,
        ...calc,
        currency: 'USD',
        configurationLabel: `Configurable batch (${allowanceRatePct}% allowances, ${deductionRatePct}% deductions — statutory tax excluded)`,
        status: 'DRAFT',
      };
    });

  if (toCreate.length > 0) {
    await Payroll.insertMany(toCreate);
  }

  await recordAuditLog({
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    actorRole: req.auth!.role,
    action: 'PAYROLL_BATCH_GENERATED',
    resourceType: 'Payroll',
    summary: `Generated ${toCreate.length} draft payroll records for ${periodYear}-${String(periodMonth).padStart(2, '0')}`,
    ipAddress: req.ip,
  });

  res.status(201).json({ generatedCount: toCreate.length });
}

export async function updatePayrollStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid payroll ID');
  }

  const { status } = payrollStatusSchema.parse(req.body);
  const payroll = await Payroll.findById(id);
  if (!payroll) {
    throw new AppError(404, 'Payroll record not found');
  }

  if (payroll.status === 'PAID') {
    throw new AppError(409, 'Payroll record is already marked as paid');
  }

  payroll.status = status;
  payroll.approvedBy = new mongoose.Types.ObjectId(req.auth!.userId);
  if (status === 'PAID') {
    payroll.paidAt = new Date();
  }
  await payroll.save();

  if (status === 'PAID') {
    const targetUser = await User.findOne({ employeeId: payroll.employeeId }).select('_id').lean();
    if (targetUser) {
      await Notification.create({
        recipientUserId: targetUser._id,
        title: 'Payslip Available',
        message: `Your payslip for ${payroll.periodYear}-${String(payroll.periodMonth).padStart(2, '0')} has been processed.`,
        category: 'PAYROLL',
        link: '/payroll',
      });
    }
  }

  await recordAuditLog({
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    actorRole: req.auth!.role,
    action: `PAYROLL_${status}`,
    resourceType: 'Payroll',
    resourceId: id,
    summary: `Marked payroll record ${payroll.periodYear}-${String(payroll.periodMonth).padStart(2, '0')} as ${status}`,
    ipAddress: req.ip,
  });

  res.json({ record: payroll });
}
