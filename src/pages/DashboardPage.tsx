import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  UserPlus,
  CalendarCheck,
  CalendarClock,
  CreditCard,
  ArrowUpRight,
  Cake,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AnimatedCounter, PageTransition, StaggerCard, StaggerGrid } from '../animations/motion';
import { Avatar } from '../components/Avatar';
import { StatusLabel } from '../components/StatusLabel';
import { CardGridSkeleton } from '../components/Skeleton';
import type { DashboardOverviewData } from '../types/hr';

const CHART_PALETTE = ['#2563EB', '#0EA5E9', '#10B981', '#F59E0B', '#64748B', '#8B5CF6'];

export function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest<DashboardOverviewData>('/api/dashboard/overview')
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const isHrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_ADMIN';
  const gridStroke = theme === 'dark' ? '#1E293B' : '#E2E8F0';
  const tickColor = theme === 'dark' ? '#94A3B8' : '#64748B';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-6 text-sm text-rose-700 dark:text-rose-300">
        {error || 'Unable to load dashboard analytics.'}
      </div>
    );
  }

  const kpiCards = [
    { label: 'Total Employees', value: data.kpis.totalEmployees, decimals: 0, suffix: '', note: 'Across all statuses' },
    { label: 'Active Employees', value: data.kpis.activeEmployees, decimals: 0, suffix: '', note: 'Currently active' },
    { label: 'On Leave', value: data.kpis.onLeave, decimals: 0, suffix: '', note: 'Approved leave today' },
    { label: 'New Employees', value: data.kpis.newEmployees, decimals: 0, suffix: '', note: 'Joined this month' },
    { label: 'Total Departments', value: data.kpis.totalDepartments, decimals: 0, suffix: '', note: 'Active business units' },
    { label: 'Attendance Rate', value: data.kpis.attendanceRate, decimals: 1, suffix: '%', note: `Logged ${data.latestAttendanceDate}` },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              People Operations Overview
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Live headcount, attendance cadence, and pending approvals from MongoDB.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isHrAdmin && (
              <button
                type="button"
                onClick={() => navigate('/employees/new')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors whitespace-nowrap"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Employee</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/attendance')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Log Attendance</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/leave')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Apply Leave</span>
            </button>
            {isHrAdmin && (
              <button
                type="button"
                onClick={() => navigate('/payroll')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Run Payroll</span>
              </button>
            )}
          </div>
        </div>

        {/* 6 Animated KPI Cards */}
        <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpiCards.map((kpi) => (
            <StaggerCard
              key={kpi.label}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {kpi.label}
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                <AnimatedCounter
                  value={kpi.value}
                  decimals={kpi.decimals}
                  suffix={kpi.suffix}
                />
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {kpi.note}
              </div>
            </StaggerCard>
          ))}
        </StaggerGrid>

        {/* Primary Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Monthly Employee Growth & Hiring */}
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Monthly Employee Growth &amp; Hiring
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cumulative headcount and monthly new hires over the past 6 months
                </p>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.charts.monthlyGrowth}>
                  <defs>
                    <linearGradient id="headcountFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                      borderColor: gridStroke,
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="headcount"
                    name="Total Headcount"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fill="url(#headcountFill)"
                  />
                  <Area
                    type="monotone"
                    dataKey="hires"
                    name="Monthly Hires"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department-wise Employee Distribution */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Department Distribution
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Active headcount allocation across business units
              </p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.departmentDistribution} layout="vertical" margin={{ left: 4, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={168}
                    tick={{ fontSize: 11, fill: tickColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                      borderColor: gridStroke,
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" name="Employees" fill="#2563EB" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Secondary Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Attendance Analytics */}
          <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Attendance Analytics
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Present, late, and absent/leave counts over recent workdays
                </p>
              </div>
              <Link
                to="/attendance"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>Open Attendance</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                      borderColor: gridStroke,
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="present" name="Present" stackId="a" fill="#10B981" />
                  <Bar dataKey="late" name="Late" stackId="a" fill="#F59E0B" />
                  <Bar dataKey="absent" name="Absent / Leave" stackId="a" fill="#64748B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Employee Status Distribution */}
          <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Employment Status Breakdown
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Current workforce availability mix
              </p>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.statusDistribution}
                    dataKey="value"
                    nameKey="status"
                    innerRadius={44}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {data.charts.statusDistribution.map((entry, idx) => (
                      <Cell key={entry.status} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                      borderColor: gridStroke,
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300 mt-2">
              {data.charts.statusDistribution.map((s, idx) => (
                <div key={s.status} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm inline-block"
                    style={{ backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length] }}
                  />
                  <span>{s.status}</span>
                  <span className="font-mono tabular-nums text-slate-400">({s.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Operational Widgets Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Recent Employees */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Recent Employees
              </h2>
              <Link
                to="/employees"
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                View directory
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.recentEmployees.map((emp) => (
                <Link
                  key={emp._id}
                  to={`/employees/${emp._id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <Avatar src={emp.avatarUrl} name={emp.fullName} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {emp.fullName}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {emp.designation} · {emp.department}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusLabel status={emp.status} />
                    <div className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
                      {emp.joiningDate}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Pending Leave Requests */}
          <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Pending Leave Requests
              </h2>
              <Link
                to="/leave"
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Manage queue
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.pendingLeaves.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  No pending leave requests.
                </div>
              ) : (
                data.pendingLeaves.map((leave) => (
                  <Link
                    key={leave._id}
                    to="/leave"
                    className="block px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {leave.employeeId?.fullName}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                        {leave.totalDays}d · {leave.leaveType}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {leave.startDate} to {leave.endDate}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Birthdays & Recent HR Activity */}
          <div className="lg:col-span-3 space-y-5">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <Cake className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Upcoming Birthdays
                </h2>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.upcomingBirthdays.length === 0 ? (
                  <div className="px-5 py-5 text-xs text-slate-500 dark:text-slate-400">
                    None in the next 30 days.
                  </div>
                ) : (
                  data.upcomingBirthdays.map((b) => (
                    <div key={b._id} className="flex items-center gap-3 px-5 py-2.5">
                      <Avatar src={b.avatarUrl} name={b.fullName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                          {b.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {b.department}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono tabular-nums text-blue-600 dark:text-blue-400 shrink-0">
                        {b.daysUntil === 0 ? 'Today' : `In ${b.daysUntil}d`}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Recent HR Activity
                </h2>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.recentActivities.slice(0, 4).map((act) => (
                  <div key={act._id} className="px-5 py-2.5">
                    <div className="text-xs text-slate-800 dark:text-slate-200 line-clamp-1">
                      {act.summary}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {act.actorEmail} · {new Date(act.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
