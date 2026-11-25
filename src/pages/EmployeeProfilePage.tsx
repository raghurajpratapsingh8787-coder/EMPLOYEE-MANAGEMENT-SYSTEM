import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Calendar, Building2 } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageTransition } from '../animations/motion';
import { Avatar } from '../components/Avatar';
import { StatusLabel } from '../components/StatusLabel';
import type {
  AttendanceRecord,
  AuditLogRecord,
  EmployeeRecord,
  LeaveBalanceRecord,
  LeaveRequestRecord,
  PayrollRecord,
  PerformanceReviewRecord,
} from '../types/hr';

interface EmployeeDetailPayload {
  employee: EmployeeRecord;
  attendanceHistory: AttendanceRecord[];
  leaveHistory: LeaveRequestRecord[];
  leaveBalance: LeaveBalanceRecord | null;
  payrollHistory: PayrollRecord[];
  performanceReviews: PerformanceReviewRecord[];
  timeline: AuditLogRecord[];
}

export function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState<EmployeeDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  type ProfileTab = 'overview' | 'attendance' | 'leave' | 'compensation' | 'performance';
  const [tab, setTab] = useState<ProfileTab>('overview');

  const isHrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_ADMIN';
  const isSelf = user?.employeeId === id;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiRequest<EmployeeDetailPayload>(`/api/employees/${id}`)
      .then((res) => setData(res))
      .catch((err) => {
        showToast(err instanceof Error ? err.message : 'Unable to load profile', 'error');
        navigate('/employees');
      })
      .finally(() => setLoading(false));
  }, [id, navigate, showToast]);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-28 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="h-64 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  const { employee, attendanceHistory, leaveHistory, leaveBalance, payrollHistory, performanceReviews, timeline } = data;
  const canSeeSalary = isHrAdmin || isSelf;

  const tabs: Array<{ id: ProfileTab; label: string }> = [
    { id: 'overview', label: 'Personal & Employment' },
    { id: 'attendance', label: 'Attendance History' },
    { id: 'leave', label: 'Leave History' },
    ...(canSeeSalary ? [{ id: 'compensation' as const, label: 'Compensation' }] : []),
    { id: 'performance', label: 'Performance' },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/employees')}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to directory</span>
          </button>

          {isHrAdmin && (
            <Link
              to={`/employees/${employee._id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-blue-500"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Employee</span>
            </Link>
          )}
        </div>

        {/* Profile Header */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar src={employee.avatarUrl} name={employee.fullName} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                {employee.fullName}
              </h1>
              <StatusLabel status={employee.status} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {employee.designationId?.name} · {employee.departmentId?.name}
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono tabular-nums">{employee.employeeId}</span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {employee.email}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                {employee.phone}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Joined {employee.joiningDate}
              </span>
            </div>
          </div>
        </div>

        {/* Segmented Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Personal Information
              </h2>
              <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Gender</dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">{employee.gender}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Date of Birth</dt>
                  <dd className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                    {employee.dateOfBirth || 'Restricted'}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate-500 dark:text-slate-400">Location</dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100 mt-0.5 inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {employee.address ? `${employee.address}, ` : ''}
                      {employee.city}, {employee.state}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Employment Information
              </h2>
              <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Department</dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100 mt-0.5 inline-flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{employee.departmentId?.name}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Designation</dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                    {employee.designationId?.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Employment Type</dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                    {employee.employmentType.replace('_', '-')}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Reporting Manager</dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                    {employee.reportingManagerId ? employee.reportingManagerId.fullName : 'Executive Level'}
                  </dd>
                </div>
              </dl>
            </div>

            {timeline.length > 0 && (
              <div className="lg:col-span-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  Activity Timeline
                </h2>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {timeline.map((item) => (
                    <div key={item._id} className="py-2.5 flex items-center justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-200">{item.summary}</span>
                      <span className="font-mono tabular-nums text-slate-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'attendance' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Check In</th>
                  <th className="py-3 px-4">Check Out</th>
                  <th className="py-3 px-4 text-right">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {attendanceHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No attendance logs visible for this profile.
                    </td>
                  </tr>
                ) : (
                  attendanceHistory.map((row) => (
                    <tr key={row._id}>
                      <td className="py-3 px-4 font-mono tabular-nums">{row.date}</td>
                      <td className="py-3 px-4">
                        <StatusLabel status={row.status} />
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums">{row.checkIn || '-'}</td>
                      <td className="py-3 px-4 font-mono tabular-nums">{row.checkOut || '-'}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right">{row.workHours.toFixed(1)}h</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'leave' && (
          <div className="space-y-4">
            {leaveBalance && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
                  <div className="text-xs text-slate-500">Casual Leave Remaining</div>
                  <div className="mt-1 text-xl font-bold font-mono tabular-nums">
                    {leaveBalance.casualTotal - leaveBalance.casualUsed} / {leaveBalance.casualTotal}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
                  <div className="text-xs text-slate-500">Sick Leave Remaining</div>
                  <div className="mt-1 text-xl font-bold font-mono tabular-nums">
                    {leaveBalance.sickTotal - leaveBalance.sickUsed} / {leaveBalance.sickTotal}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
                  <div className="text-xs text-slate-500">Earned Leave Remaining</div>
                  <div className="mt-1 text-xl font-bold font-mono tabular-nums">
                    {leaveBalance.earnedTotal - leaveBalance.earnedUsed} / {leaveBalance.earnedTotal}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4">Days</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {leaveHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No leave history available.
                      </td>
                    </tr>
                  ) : (
                    leaveHistory.map((l) => (
                      <tr key={l._id}>
                        <td className="py-3 px-4 font-medium">{l.leaveType}</td>
                        <td className="py-3 px-4 font-mono tabular-nums">
                          {l.startDate} to {l.endDate}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums">{l.totalDays}</td>
                        <td className="py-3 px-4">{l.reason}</td>
                        <td className="py-3 px-4">
                          <StatusLabel status={l.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'compensation' && canSeeSalary && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
              <div className="text-xs text-slate-500">Monthly Base Salary</div>
              <div className="text-2xl font-bold font-mono tabular-nums mt-1">
                ${(employee.salary || 0).toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Restricted compensation record visible only to authorized HR administrators and the employee.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4 text-right">Basic</th>
                    <th className="py-3 px-4 text-right">Allowances</th>
                    <th className="py-3 px-4 text-right">Gross</th>
                    <th className="py-3 px-4 text-right">Net</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payrollHistory.map((p) => (
                    <tr key={p._id}>
                      <td className="py-3 px-4 font-mono tabular-nums">
                        {p.periodYear}-{String(p.periodMonth).padStart(2, '0')}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right">${p.basicSalary.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right">${p.allowances.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right font-medium">${p.grossSalary.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right font-semibold">${p.netSalary.toLocaleString()}</td>
                      <td className="py-3 px-4"><StatusLabel status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'performance' && (
          <div className="space-y-4">
            {performanceReviews.length === 0 ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-8 text-center text-xs text-slate-500">
                No performance reviews recorded for this employee.
              </div>
            ) : (
              performanceReviews.map((rev) => (
                <div
                  key={rev._id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{rev.reviewPeriod}</div>
                      <div className="text-xs text-slate-500">
                        Reviewed by {rev.reviewerId?.fullName} on {rev.reviewDate}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold tabular-nums">{rev.rating.toFixed(1)} / 5.0</span>
                      <StatusLabel status={rev.status} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{rev.feedback}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
