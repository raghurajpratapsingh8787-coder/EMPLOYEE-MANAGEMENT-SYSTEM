import React, { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, Clock, Plus } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AnimatedCounter, PageTransition } from '../animations/motion';
import { Avatar } from '../components/Avatar';
import { StatusLabel } from '../components/StatusLabel';
import { Modal } from '../components/Modal';
import type { AttendanceRecord, AttendanceStatus, EmployeeRecord } from '../types/hr';

interface DailySummary {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
  totalLogged: number;
  attendancePercentage: number;
}

interface MonthlyReportRow {
  _id: string;
  employeeId: string;
  fullName: string;
  departmentName?: string;
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  onLeave: number;
  totalHours: number;
}

export function AttendancePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isHrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_ADMIN';

  const [tab, setTab] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState<DailySummary>({
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    onLeave: 0,
    totalLogged: 0,
    attendancePercentage: 0,
  });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [monthlyRows, setMonthlyRows] = useState<MonthlyReportRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [formEmpId, setFormEmpId] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formStatus, setFormStatus] = useState<AttendanceStatus>('PRESENT');
  const [checkIn, setCheckIn] = useState('09:00');
  const [checkOut, setCheckOut] = useState('17:30');
  const [workHours, setWorkHours] = useState(8);
  const [notes, setNotes] = useState('');

  const loadDaily = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{
        date: string;
        summary: DailySummary;
        records: AttendanceRecord[];
      }>(`/api/attendance/daily?date=${selectedDate}`);
      setSummary(res.summary);
      setRecords(res.records);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load attendance', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, showToast]);

  const loadMonthly = useCallback(async () => {
    const [y, m] = selectedDate.split('-').map(Number);
    try {
      const res = await apiRequest<{ items: MonthlyReportRow[] }>(
        `/api/attendance/monthly-report?year=${y}&month=${m}`
      );
      setMonthlyRows(res.items);
    } catch {
      // Ignore
    }
  }, [selectedDate]);

  useEffect(() => {
    loadDaily();
    loadMonthly();
  }, [loadDaily, loadMonthly]);

  useEffect(() => {
    if (isHrAdmin) {
      apiRequest<{ items: EmployeeRecord[] }>('/api/employees?limit=100')
        .then((res) => {
          setEmployees(res.items);
          if (res.items.length > 0 && !formEmpId) setFormEmpId(res.items[0]._id);
        })
        .catch(() => {});
    } else if (user?.employeeId) {
      setFormEmpId(user.employeeId);
    }
  }, [isHrAdmin, user?.employeeId, formEmpId]);

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: formEmpId,
          date: formDate,
          status: formStatus,
          checkIn: formStatus === 'ABSENT' || formStatus === 'ON_LEAVE' ? '' : checkIn,
          checkOut: formStatus === 'ABSENT' || formStatus === 'ON_LEAVE' ? '' : checkOut,
          workHours: formStatus === 'ABSENT' || formStatus === 'ON_LEAVE' ? 0 : Number(workHours),
          notes,
        }),
      });
      showToast('Attendance recorded', 'success');
      setModalOpen(false);
      setSelectedDate(formDate);
      loadDaily();
      loadMonthly();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save attendance', 'error');
    }
  };

  const handleSelfCheckIn = async () => {
    if (!user?.employeeId) {
      showToast('No linked employee profile found for self check-in', 'error');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 5);
    try {
      await apiRequest('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: user.employeeId,
          date: today,
          status: 'PRESENT',
          checkIn: nowTime,
          checkOut: '17:30',
          workHours: 8,
          notes: 'Self check-in',
        }),
      });
      showToast(`Checked in for ${today} at ${nowTime}`, 'success');
      setSelectedDate(today);
      loadDaily();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Check-in failed', 'error');
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Attendance Management
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Daily presence tracking, audit-verified edits, and monthly employee summaries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              aria-label="Attendance date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-xs font-mono"
            />
            {user?.employeeId && (
              <button
                type="button"
                onClick={handleSelfCheckIn}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Self Check-In Today</span>
              </button>
            )}
            {isHrAdmin && (
              <button
                type="button"
                onClick={() => {
                  setFormDate(selectedDate);
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-blue-500 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Attendance</span>
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Present</div>
            <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              <AnimatedCounter value={summary.present} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Late Arrivals</div>
            <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
              <AnimatedCounter value={summary.late} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Absent</div>
            <div className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">
              <AnimatedCounter value={summary.absent} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">On Leave</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              <AnimatedCounter value={summary.onLeave} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Attendance Rate</div>
            <div className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
              <AnimatedCounter value={summary.attendancePercentage} suffix="%" />
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
          <button
            type="button"
            onClick={() => setTab('daily')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium ${
              tab === 'daily'
                ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Daily Log ({selectedDate})
          </button>
          <button
            type="button"
            onClick={() => setTab('monthly')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium ${
              tab === 'monthly'
                ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Monthly Report
          </button>
        </div>

        {tab === 'daily' ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Check In</th>
                    <th className="py-3 px-4">Check Out</th>
                    <th className="py-3 px-4 text-right">Hours</th>
                    <th className="py-3 px-4">Recorded / Modified By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Loading attendance records...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        <CalendarCheck className="w-5 h-5 mx-auto mb-2 opacity-50" />
                        No attendance entries logged for {selectedDate}.
                      </td>
                    </tr>
                  ) : (
                    records.map((rec) => {
                      const emp = typeof rec.employeeId === 'object' ? rec.employeeId : null;
                      return (
                        <tr key={rec._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <Avatar src={emp?.avatarUrl} name={emp?.fullName || 'Employee'} size="sm" />
                              <div>
                                <div className="font-medium text-slate-900 dark:text-slate-100">
                                  {emp?.fullName}
                                </div>
                                <div className="font-mono text-[11px] text-slate-400">
                                  {emp?.employeeId}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            {emp?.departmentId?.name || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <StatusLabel status={rec.status} />
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums">{rec.checkIn || '-'}</td>
                          <td className="py-3 px-4 font-mono tabular-nums">{rec.checkOut || '-'}</td>
                          <td className="py-3 px-4 font-mono tabular-nums text-right">
                            {rec.workHours.toFixed(1)}h
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                            {rec.modifiedBy?.fullName || 'System'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-right">Present</th>
                    <th className="py-3 px-4 text-right">Late</th>
                    <th className="py-3 px-4 text-right">Half-day</th>
                    <th className="py-3 px-4 text-right">Absent</th>
                    <th className="py-3 px-4 text-right">On Leave</th>
                    <th className="py-3 px-4 text-right">Total Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {monthlyRows.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {row.fullName} <span className="font-mono text-slate-400">({row.employeeId})</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {row.departmentName || '-'}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-emerald-600">
                        {row.present}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-amber-600">
                        {row.late}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right">{row.halfDay}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-rose-600">
                        {row.absent}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right">{row.onLeave}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right font-semibold">
                        {row.totalHours.toFixed(1)}h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Log or Update Attendance"
        subtitle="Authorized attendance edits record the modifying administrator."
      >
        <form onSubmit={handleSaveAttendance} className="space-y-4">
          <div>
            <label htmlFor="att-emp" className="block text-xs font-medium mb-1">
              Employee
            </label>
            <select
              id="att-emp"
              required
              value={formEmpId}
              onChange={(e) => setFormEmpId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            >
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.fullName} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="att-date" className="block text-xs font-medium mb-1">
                Date
              </label>
              <input
                id="att-date"
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <div>
              <label htmlFor="att-status" className="block text-xs font-medium mb-1">
                Status
              </label>
              <select
                id="att-status"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as AttendanceStatus)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              >
                <option value="PRESENT">Present</option>
                <option value="LATE">Late</option>
                <option value="HALF_DAY">Half-day</option>
                <option value="ABSENT">Absent</option>
                <option value="ON_LEAVE">On leave</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="att-in" className="block text-xs font-medium mb-1">
                Check In
              </label>
              <input
                id="att-in"
                type="time"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
              />
            </div>
            <div>
              <label htmlFor="att-out" className="block text-xs font-medium mb-1">
                Check Out
              </label>
              <input
                id="att-out"
                type="time"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
              />
            </div>
            <div>
              <label htmlFor="att-hours" className="block text-xs font-medium mb-1">
                Work Hours
              </label>
              <input
                id="att-hours"
                type="number"
                step="0.25"
                min={0}
                max={24}
                value={workHours}
                onChange={(e) => setWorkHours(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tabular-nums"
              />
            </div>
          </div>

          <div>
            <label htmlFor="att-notes" className="block text-xs font-medium mb-1">
              Notes
            </label>
            <input
              id="att-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional note"
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium"
            >
              Save Attendance
            </button>
          </div>
        </form>
      </Modal>
    </PageTransition>
  );
}
