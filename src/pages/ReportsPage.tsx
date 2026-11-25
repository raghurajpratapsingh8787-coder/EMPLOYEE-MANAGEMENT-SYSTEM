import React, { useEffect, useState } from 'react';
import { Download, Shield } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiRequest, getAccessToken } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { PageTransition } from '../animations/motion';
import type { AuditLogRecord, DashboardOverviewData } from '../types/hr';

export function ReportsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const isHrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_ADMIN';

  const [overview, setOverview] = useState<DashboardOverviewData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiRequest<DashboardOverviewData>('/api/dashboard/overview'),
      isHrAdmin
        ? apiRequest<{ items: AuditLogRecord[] }>('/api/dashboard/audit-logs')
        : Promise.resolve({ items: [] }),
    ])
      .then(([ov, logs]) => {
        setOverview(ov);
        setAuditLogs(logs.items);
      })
      .catch((err) => showToast(err instanceof Error ? err.message : 'Failed to load reports', 'error'))
      .finally(() => setLoading(false));
  }, [isHrAdmin, showToast]);

  const handleExportEmployees = async () => {
    try {
      const res = await fetch('/api/employees/export', {
        credentials: 'include',
        headers: { Authorization: `Bearer ${getAccessToken() || ''}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'calibre-workforce-report.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Workforce report downloaded', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed', 'error');
    }
  };

  const gridStroke = theme === 'dark' ? '#1E293B' : '#E2E8F0';
  const tickColor = theme === 'dark' ? '#94A3B8' : '#64748B';

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Reports &amp; Audit Analytics
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Department metrics, workforce exports, and security audit trail.
            </p>
          </div>
          {isHrAdmin && (
            <button
              type="button"
              onClick={handleExportEmployees}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-blue-500 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Employee CSV</span>
            </button>
          )}
        </div>

        {loading || !overview ? (
          <div className="h-64 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
              <h2 className="text-sm font-semibold mb-4">Headcount by Department</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.charts.departmentDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                        borderColor: gridStroke,
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" name="Employees" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
              <h2 className="text-sm font-semibold mb-4">Monthly Hiring Velocity</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.charts.monthlyGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                        borderColor: gridStroke,
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="hires" name="New Hires" fill="#10B981" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {isHrAdmin && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Security &amp; Administrative Audit Log
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-medium">{log.actorEmail}</td>
                      <td className="py-2.5 px-4 font-mono text-[11px]">{log.actorRole}</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">{log.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
