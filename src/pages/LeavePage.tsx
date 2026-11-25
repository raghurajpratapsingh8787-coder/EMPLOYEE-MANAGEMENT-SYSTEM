import React, { useCallback, useEffect, useState } from 'react';
import { CalendarPlus, Check, X } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageTransition } from '../animations/motion';
import { Avatar } from '../components/Avatar';
import { StatusLabel } from '../components/StatusLabel';
import { Modal } from '../components/Modal';
import type { EmployeeRecord, LeaveBalanceRecord, LeaveRequestRecord, LeaveType } from '../types/hr';

export function LeavePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isHrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_ADMIN';
  const canApprove = isHrAdmin || user?.role === 'MANAGER';

  const [requests, setRequests] = useState<LeaveRequestRecord[]>([]);
  const [balances, setBalances] = useState<LeaveBalanceRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [applyOpen, setApplyOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState<LeaveType>('CASUAL');
  const [customTypeLabel, setCustomTypeLabel] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');

  const [reviewTarget, setReviewTarget] = useState<{
    item: LeaveRequestRecord;
    decision: 'APPROVED' | 'REJECTED';
  } | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : '';
      const [reqRes, balRes] = await Promise.all([
        apiRequest<{ items: LeaveRequestRecord[] }>(`/api/leave${qs}`),
        apiRequest<{ items: LeaveBalanceRecord[] }>('/api/leave/balances'),
      ]);
      setRequests(reqRes.items);
      setBalances(balRes.items);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load leave records', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isHrAdmin) {
      apiRequest<{ items: EmployeeRecord[] }>('/api/employees?limit=100')
        .then((res) => {
          setEmployees(res.items);
          if (!employeeId && user?.employeeId) setEmployeeId(user.employeeId);
          else if (!employeeId && res.items[0]) setEmployeeId(res.items[0]._id);
        })
        .catch(() => {});
    }
  }, [isHrAdmin, employeeId, user?.employeeId]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/leave', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: isHrAdmin && employeeId ? employeeId : undefined,
          leaveType,
          customTypeLabel: leaveType === 'OTHER' ? customTypeLabel : undefined,
          startDate,
          endDate,
          reason,
        }),
      });
      showToast('Leave request submitted', 'success');
      setApplyOpen(false);
      setReason('');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to submit leave request', 'error');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget) return;
    try {
      await apiRequest(`/api/leave/${reviewTarget.item._id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: reviewTarget.decision,
          reviewComment,
        }),
      });
      showToast(`Leave request ${reviewTarget.decision.toLowerCase()}`, 'success');
      setReviewTarget(null);
      setReviewComment('');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Review failed', 'error');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await apiRequest(`/api/leave/${id}/cancel`, { method: 'PATCH' });
      showToast('Leave request cancelled', 'info');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to cancel leave request', 'error');
    }
  };

  const myBalance = balances.find((b) => {
    const bEmpId = typeof b.employeeId === 'object' ? b.employeeId._id : b.employeeId;
    return user?.employeeId ? bEmpId === user.employeeId : true;
  });

  const approvedCalendar = requests.filter((r) => r.status === 'APPROVED');

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Leave Management
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Leave balances, overlap-validated applications, and manager approval queues.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setApplyOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-blue-500 whitespace-nowrap"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>Apply for Leave</span>
          </button>
        </div>

        {/* Balance Cards */}
        {myBalance && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Casual Leave Available</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums">
                {myBalance.casualTotal - myBalance.casualUsed}
                <span className="text-sm font-normal text-slate-400"> / {myBalance.casualTotal}d</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Sick Leave Available</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums">
                {myBalance.sickTotal - myBalance.sickUsed}
                <span className="text-sm font-normal text-slate-400"> / {myBalance.sickTotal}d</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Earned Leave Available</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums">
                {myBalance.earnedTotal - myBalance.earnedUsed}
                <span className="text-sm font-normal text-slate-400"> / {myBalance.earnedTotal}d</span>
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
          {[
            { value: '', label: 'All Requests' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                statusFilter === opt.value
                  ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Requests Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Date Range</th>
                  <th className="py-3 px-4 text-right">Days</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Loading leave requests...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No leave requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((item) => {
                    const isOwner = user?.employeeId && item.employeeId?._id === user.employeeId;
                    return (
                      <tr key={item._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar src={item.employeeId?.avatarUrl} name={item.employeeId?.fullName || 'Emp'} size="sm" />
                            <div>
                              <div className="font-medium text-slate-900 dark:text-slate-100">
                                {item.employeeId?.fullName}
                              </div>
                              <div className="font-mono text-[11px] text-slate-400">
                                {item.employeeId?.employeeId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {item.leaveType === 'OTHER' && item.customTypeLabel
                            ? item.customTypeLabel
                            : item.leaveType}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                          {item.startDate} to {item.endDate}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-right">
                          {item.totalDays}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="truncate text-slate-700 dark:text-slate-200">{item.reason}</div>
                          {item.reviewComment && (
                            <div className="text-[11px] text-slate-400 truncate">
                              Note: {item.reviewComment}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <StatusLabel status={item.status} />
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {item.status === 'PENDING' && (
                            <div className="inline-flex items-center gap-1.5">
                              {canApprove && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setReviewTarget({ item, decision: 'APPROVED' })}
                                    aria-label={`Approve leave for ${item.employeeId?.fullName}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-500"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setReviewTarget({ item, decision: 'REJECTED' })}
                                    aria-label={`Reject leave for ${item.employeeId?.fullName}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-600 text-white hover:bg-rose-500"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Reject</span>
                                  </button>
                                </>
                              )}
                              {(isOwner || isHrAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => handleCancel(item._id)}
                                  className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leave Calendar Summary */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
            Approved Leave Calendar
          </h2>
          {approvedCalendar.length === 0 ? (
            <p className="text-xs text-slate-500">No upcoming approved absences scheduled.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {approvedCalendar.map((item) => (
                <div
                  key={item._id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {item.employeeId?.fullName}
                    </div>
                    <div className="text-slate-500 font-mono tabular-nums mt-0.5">
                      {item.startDate} to {item.endDate}
                    </div>
                  </div>
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {item.totalDays}d
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Apply Leave Modal */}
      <Modal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title="Apply for Leave"
        subtitle="Overlapping dates are automatically prevented."
      >
        <form onSubmit={handleApply} className="space-y-4">
          {isHrAdmin && (
            <div>
              <label htmlFor="leave-emp" className="block text-xs font-medium mb-1">
                Employee
              </label>
              <select
                id="leave-emp"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              >
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.fullName} ({emp.employeeId})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="leave-type" className="block text-xs font-medium mb-1">
              Leave Type
            </label>
            <select
              id="leave-type"
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            >
              <option value="CASUAL">Casual Leave</option>
              <option value="SICK">Sick Leave</option>
              <option value="EARNED">Earned Leave</option>
              <option value="UNPAID">Unpaid Leave</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {leaveType === 'OTHER' && (
            <div>
              <label htmlFor="leave-custom" className="block text-xs font-medium mb-1">
                Custom Leave Label
              </label>
              <input
                id="leave-custom"
                required
                value={customTypeLabel}
                onChange={(e) => setCustomTypeLabel(e.target.value)}
                placeholder="e.g., Bereavement / Jury Duty"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="leave-start" className="block text-xs font-medium mb-1">
                Start Date
              </label>
              <input
                id="leave-start"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <div>
              <label htmlFor="leave-end" className="block text-xs font-medium mb-1">
                End Date
              </label>
              <input
                id="leave-end"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="leave-reason" className="block text-xs font-medium mb-1">
              Reason
            </label>
            <textarea
              id="leave-reason"
              required
              minLength={5}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide brief context for your request"
              className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setApplyOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium"
            >
              Submit Request
            </button>
          </div>
        </form>
      </Modal>

      {/* Review Decision Modal */}
      <Modal
        open={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        title={reviewTarget?.decision === 'APPROVED' ? 'Approve Leave Request' : 'Reject Leave Request'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {reviewTarget?.item.employeeId?.fullName} · {reviewTarget?.item.startDate} to{' '}
            {reviewTarget?.item.endDate} ({reviewTarget?.item.totalDays} day(s))
          </p>
          <div>
            <label htmlFor="review-comment" className="block text-xs font-medium mb-1">
              Approval Comment (optional)
            </label>
            <textarea
              id="review-comment"
              rows={3}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReviewTarget(null)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-lg text-white text-xs font-medium ${
                reviewTarget?.decision === 'APPROVED' ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              Confirm {reviewTarget?.decision === 'APPROVED' ? 'Approval' : 'Rejection'}
            </button>
          </div>
        </form>
      </Modal>
    </PageTransition>
  );
}
