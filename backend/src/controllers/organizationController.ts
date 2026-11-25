import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Department } from '../models/Department';
import { Designation } from '../models/Designation';
import { Employee } from '../models/Employee';
import { departmentSchema, designationSchema } from '../validators/schemas';
import { AppError } from '../middleware/security';
import { recordAuditLog } from '../services/auditService';

export async function listDepartments(_req: Request, res: Response): Promise<void> {
  const [departments, counts] = await Promise.all([
    Department.find().populate('headId', 'fullName employeeId avatarUrl').sort({ name: 1 }).lean(),
    Employee.aggregate([
      { $group: { _id: '$departmentId', employeeCount: { $sum: 1 } } },
    ]),
  ]);

  const countMap = new Map<string, number>();
  for (const c of counts) {
    if (c._id) countMap.set(String(c._id), c.employeeCount);
  }

  const items = departments.map((dept) => ({
    ...dept,
    employeeCount: countMap.get(String(dept._id)) || 0,
  }));

  res.json({ items });
}

export async function createDepartment(req: Request, res: Response): Promise<void> {
  const payload = departmentSchema.parse(req.body);
  const department = await Department.create(payload);

  await recordAuditLog({
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    actorRole: req.auth!.role,
    action: 'DEPARTMENT_CREATED',
    resourceType: 'Department',
    resourceId: department._id.toString(),
    summary: `Created department ${department.name} (${department.code})`,
    ipAddress: req.ip,
  });

  res.status(201).json({ department });
}

export async function updateDepartment(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid department ID');
  }
  const payload = departmentSchema.partial().parse(req.body);
  const department = await Department.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).lean();
  if (!department) {
    throw new AppError(404, 'Department not found');
  }

  await recordAuditLog({
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    actorRole: req.auth!.role,
    action: 'DEPARTMENT_UPDATED',
    resourceType: 'Department',
    resourceId: id,
    summary: `Updated department ${department.name}`,
    ipAddress: req.ip,
  });

  res.json({ department });
}

export async function deleteDepartment(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid department ID');
  }

  const assignedEmployees = await Employee.countDocuments({ departmentId: id });
  if (assignedEmployees > 0) {
    throw new AppError(
      409,
      `Cannot delete department while ${assignedEmployees} employee(s) remain assigned. Reassign employees first.`
    );
  }

  const assignedDesignations = await Designation.countDocuments({ departmentId: id });
  if (assignedDesignations > 0) {
    throw new AppError(
      409,
      `Cannot delete department while ${assignedDesignations} designation(s) are linked to it.`
    );
  }

  const deleted = await Department.findByIdAndDelete(id);
  if (!deleted) {
    throw new AppError(404, 'Department not found');
  }

  await recordAuditLog({
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    actorRole: req.auth!.role,
    action: 'DEPARTMENT_DELETED',
    resourceType: 'Department',
    resourceId: id,
    summary: `Deleted department ${deleted.name}`,
    ipAddress: req.ip,
  });

  res.json({ message: 'Department deleted successfully' });
}

export async function listDesignations(req: Request, res: Response): Promise<void> {
  const filter: Record<string, unknown> = {};
  if (typeof req.query.departmentId === 'string' && mongoose.Types.ObjectId.isValid(req.query.departmentId)) {
    filter.departmentId = req.query.departmentId;
  }

  const [designations, counts] = await Promise.all([
    Designation.find(filter).populate('departmentId', 'name code').sort({ level: -1, name: 1 }).lean(),
    Employee.aggregate([
      { $group: { _id: '$designationId', employeeCount: { $sum: 1 } } },
    ]),
  ]);

  const countMap = new Map<string, number>();
  for (const c of counts) {
    if (c._id) countMap.set(String(c._id), c.employeeCount);
  }

  const items = designations.map((d) => ({
    ...d,
    employeeCount: countMap.get(String(d._id)) || 0,
  }));

  res.json({ items });
}

export async function createDesignation(req: Request, res: Response): Promise<void> {
  const payload = designationSchema.parse(req.body);
  const designation = await Designation.create(payload);

  await recordAuditLog({
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    actorRole: req.auth!.role,
    action: 'DESIGNATION_CREATED',
    resourceType: 'Designation',
    resourceId: designation._id.toString(),
    summary: `Created designation ${designation.name} (L${designation.level})`,
    ipAddress: req.ip,
  });

  res.status(201).json({ designation });
}

export async function updateDesignation(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid designation ID');
  }
  const payload = designationSchema.partial().parse(req.body);
  const designation = await Designation.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).lean();
  if (!designation) {
    throw new AppError(404, 'Designation not found');
  }

  res.json({ designation });
}

export async function deleteDesignation(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid designation ID');
  }

  const assignedCount = await Employee.countDocuments({ designationId: id });
  if (assignedCount > 0) {
    throw new AppError(
      409,
      `Cannot delete designation while ${assignedCount} employee(s) hold this title. Reassign employees first.`
    );
  }

  const deleted = await Designation.findByIdAndDelete(id);
  if (!deleted) {
    throw new AppError(404, 'Designation not found');
  }

  await recordAuditLog({
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    actorRole: req.auth!.role,
    action: 'DESIGNATION_DELETED',
    resourceType: 'Designation',
    resourceId: id,
    summary: `Deleted designation ${deleted.name}`,
    ipAddress: req.ip,
  });

  res.json({ message: 'Designation deleted successfully' });
}
