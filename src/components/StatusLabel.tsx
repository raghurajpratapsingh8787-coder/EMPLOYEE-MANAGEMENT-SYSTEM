import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  MinusCircle,
} from 'lucide-react';

type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const STATUS_MAP: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Active', tone: 'success' },
  INACTIVE: { label: 'Inactive', tone: 'neutral' },
  ON_LEAVE: { label: 'On leave', tone: 'warning' },
  TERMINATED: { label: 'Terminated', tone: 'danger' },
  PRESENT: { label: 'Present', tone: 'success' },
  LATE: { label: 'Late', tone: 'warning' },
  HALF_DAY: { label: 'Half-day', tone: 'info' },
  ABSENT: { label: 'Absent', tone: 'danger' },
  PENDING: { label: 'Pending', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  DRAFT: { label: 'Draft', tone: 'neutral' },
  PAID: { label: 'Paid', tone: 'success' },
  SHARED: { label: 'Shared', tone: 'info' },
  ACKNOWLEDGED: { label: 'Acknowledged', tone: 'success' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  IN_PROGRESS: { label: 'In progress', tone: 'info' },
  NOT_STARTED: { label: 'Not started', tone: 'neutral' },
};

const TONE_CLASS: Record<Tone, string> = {
  success: 'text-emerald-700 dark:text-emerald-400',
  warning: 'text-amber-700 dark:text-amber-400',
  danger: 'text-rose-700 dark:text-rose-400',
  info: 'text-blue-700 dark:text-blue-400',
  neutral: 'text-slate-600 dark:text-slate-400',
};

export function StatusLabel({ status }: { status: string }) {
  const meta = STATUS_MAP[status] || { label: status.replace(/_/g, ' '), tone: 'neutral' as Tone };
  const color = TONE_CLASS[meta.tone];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${color}`}>
      {meta.tone === 'success' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
      {meta.tone === 'warning' && <Clock className="w-3.5 h-3.5 shrink-0" />}
      {meta.tone === 'danger' && <XCircle className="w-3.5 h-3.5 shrink-0" />}
      {meta.tone === 'info' && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
      {meta.tone === 'neutral' && <MinusCircle className="w-3.5 h-3.5 shrink-0" />}
      <span>{meta.label}</span>
    </span>
  );
}
