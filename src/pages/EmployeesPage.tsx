import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Download,
  Search,
  Eye,
  Pencil,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { apiRequest, getAccessToken } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageTransition } from '../animations/motion';
import { Avatar } from '../components/Avatar';
import { StatusLabel } from '../components/StatusLabel';
import { TableSkeleton } from '../components/Skeleton';
import { Modal } from '../components/Modal';
import type { DepartmentRef, EmployeeRecord, EmployeeStatus } from '../types/hr';

export function EmployeesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const isHrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_ADMIN';

  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('employeeId');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<EmployeeStatus>('ACTIVE');
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRecord | null>(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: '10',
        sortBy,
        sortOrder,
      });
      if (search.trim()) qs.set('search', search.trim());
      if (departmentId) qs.set('departmentId', departmentId);
      if (statusFilter) qs.set('status', statusFilter);
      if (typeFilter) qs.set('employmentType', typeFilter);

      const res = await apiRequest<{
        items: EmployeeRecord[];
        total: number;
        totalPages: number;
      }>(`/api/employees?${qs.toString()}`);

      setEmployees(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, departmentId, statusFilter, typeFilter, sortBy, sortOrder, showToast]);

  useEffect(() => {
    apiRequest<{ items: DepartmentRef[] }>('/api/organization/departments')
      .then((res) => setDepartments(res.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchEmployees, 150);
    return () => clearTimeout(t);
  }, [fetchEmployees]);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === employees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(employees.map((e) => e._id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkStatusApply = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await apiRequest<{ updatedCount: number }>('/api/employees/bulk-status', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds, status: bulkStatus }),
      });
      showToast(`Updated ${res.updatedCount} employee record(s)`, 'success');
      setSelectedIds([]);
      fetchEmployees();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Bulk update failed', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiRequest(`/api/employees/${deleteTarget._id}`, { method: 'DELETE' });
      showToast(`Removed ${deleteTarget.fullName} from directory`, 'success');
      setDeleteTarget(null);
      fetchEmployees();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await fetch('/api/employees/export', {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${getAccessToken() || ''}`,
        },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'calibre-employees.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Employee directory exported to CSV', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed', 'error');
    }
  };

  return (
    <PageTransition>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Employee Directory
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              {total} total records across active and historical workforce
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isHrAdmin && (
              <>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/employees/new')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-blue-500 whitespace-nowrap"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Employee</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Filter employees by name, ID, or email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, employee ID, or email..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Filter by department"
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by employment type"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
            >
              <option value="">All Types</option>
              <option value="FULL_TIME">Full-time</option>
              <option value="PART_TIME">Part-time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERN">Intern</option>
            </select>

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On leave</option>
              <option value="INACTIVE">Inactive</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {isHrAdmin && selectedIds.length > 0 && (
          <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 tabular-nums">
              {selectedIds.length} employee(s) selected
            </span>
            <div className="flex items-center gap-2">
              <select
                aria-label="Bulk target status"
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as EmployeeStatus)}
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="ACTIVE">Set Active</option>
                <option value="ON_LEAVE">Set On Leave</option>
                <option value="INACTIVE">Set Inactive</option>
                <option value="TERMINATED">Set Terminated</option>
              </select>
              <button
                type="button"
                onClick={handleBulkStatusApply}
                className="h-8 px-3 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:bg-slate-800"
              >
                Apply Bulk Status
              </button>
            </div>
          </div>
        )}

        {/* Directory Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
          {loading ? (
            <TableSkeleton rows={6} />
          ) : employees.length === 0 ? (
            <div className="px-6 py-12 text-center space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                No employees match the current search or filter criteria.
              </p>
              {isHrAdmin && (
                <button
                  type="button"
                  onClick={() => navigate('/employees/new')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Employee</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {isHrAdmin && (
                      <th className="py-3 pl-3 pr-1.5 w-9">
                        <input
                          type="checkbox"
                          aria-label="Select all employees on page"
                          checked={selectedIds.length === employees.length && employees.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300"
                        />
                      </th>
                    )}
                    <th className="py-3 px-2.5">
                      <button
                        type="button"
                        onClick={() => toggleSort('employeeId')}
                        className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                      >
                        <span>Employee ID</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-2.5">
                      <button
                        type="button"
                        onClick={() => toggleSort('fullName')}
                        className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                      >
                        <span>Employee</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-2.5">Department</th>
                    <th className="py-3 px-2.5">Designation</th>
                    <th className="py-3 px-2.5">
                      <button
                        type="button"
                        onClick={() => toggleSort('joiningDate')}
                        className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                      >
                        <span>Joining Date</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-2.5">Type</th>
                    <th className="py-3 px-2.5">Status</th>
                    <th className="py-3 pl-2.5 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {employees.map((emp) => (
                    <tr
                      key={emp._id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {isHrAdmin && (
                        <td className="py-3 pl-3 pr-1.5">
                          <input
                            type="checkbox"
                            aria-label={`Select ${emp.fullName}`}
                            checked={selectedIds.includes(emp._id)}
                            onChange={() => toggleSelectOne(emp._id)}
                            className="rounded border-slate-300"
                          />
                        </td>
                      )}
                      <td className="py-3 px-2.5 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {emp.employeeId}
                      </td>
                      <td className="py-3 px-2.5 max-w-[210px]">
                        <Link
                          to={`/employees/${emp._id}`}
                          className="flex items-center gap-2.5 group"
                        >
                          <Avatar src={emp.avatarUrl} name={emp.fullName} size="sm" />
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                              {emp.fullName}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {emp.email}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-2.5 text-xs text-slate-700 dark:text-slate-300 max-w-[140px] truncate whitespace-nowrap" title={emp.departmentId?.name || ''}>
                        {emp.departmentId?.name || '-'}
                      </td>
                      <td className="py-3 px-2.5 text-xs text-slate-600 dark:text-slate-400 max-w-[165px] truncate whitespace-nowrap" title={emp.designationId?.name || ''}>
                        {emp.designationId?.name || '-'}
                      </td>
                      <td className="py-3 px-2.5 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {emp.joiningDate}
                      </td>
                      <td className="py-3 px-2.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {emp.employmentType.replace('_', '-').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                      </td>
                      <td className="py-3 px-2.5 whitespace-nowrap">
                        <StatusLabel status={emp.status} />
                      </td>
                      <td className="py-3 pl-2.5 pr-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-0.5">
                          <Link
                            to={`/employees/${emp._id}`}
                            aria-label={`View ${emp.fullName}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {isHrAdmin && (
                            <>
                              <Link
                                to={`/employees/${emp._id}/edit`}
                                aria-label={`Edit ${emp.fullName}`}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Pencil className="w-4 h-4" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(emp)}
                                aria-label={`Delete ${emp.fullName}`}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="tabular-nums">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Employee Removal"
        subtitle="This removes the employee profile and associated records from MongoDB."
        maxWidth="max-w-md"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-slate-900 dark:text-white">
            {deleteTarget?.fullName}
          </span>{' '}
          (<span className="font-mono">{deleteTarget?.employeeId}</span>)?
        </p>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeleteTarget(null)}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-500"
          >
            Delete Employee
          </button>
        </div>
      </Modal>
    </PageTransition>
  );
}
