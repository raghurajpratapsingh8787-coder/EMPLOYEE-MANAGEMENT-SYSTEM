import { AuditLog } from '../models/AuditLog';

export async function recordAuditLog(params: {
  actorUserId?: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  summary: string;
  ipAddress?: string;
}): Promise<void> {
  try {
    await AuditLog.create({
      actorUserId: params.actorUserId,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      summary: params.summary,
      ipAddress: params.ipAddress,
    });
  } catch (err) {
    console.error('Audit log write failed:', err instanceof Error ? err.message : 'Unknown');
  }
}
