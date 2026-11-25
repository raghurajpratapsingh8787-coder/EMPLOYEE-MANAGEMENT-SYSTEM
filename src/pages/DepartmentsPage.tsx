import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageTransition } from '../animations/motion';
import { Modal } from '../components/Modal';
import { Avatar } from '../components/Avatar';
import type { DepartmentRef, EmployeeRecord } from '../types/hr';

export function DepartmentsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isHrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_ADMIN';

  const [departments, setDepartments] = useState<DepartmentRef[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRef | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [headId, setHeadId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, empRes] = await Promise.all([
        apiRequest<{ items: DepartmentRef[] }>('/api/organization/departments'),
        apiRequest<{ items: EmployeeRecord[] }>('/api/employees?limit=100'),
      ]);
      setDepartments(deptRes.items);
      setEmployees(empRes.items);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load departments', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setCode('');
    setDescription('');
    setHeadId('');
    setModalOpen(true);
  };

  const openEdit = (d: DepartmentRef) => {
    setEditing(d);
    setName(d.name);
    setCode(d.code);
    setDescription(d.description || '');
    setHeadId(typeof d.headId === 'object' && d.headId ? d.headId._id : (d.headId as string) || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = { name, code, description, headId };
      if (editing) {
        await apiRequest(`/api/organization/departments/${editing._id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        showToast('Department updated', 'success');
      } else {
        await apiRequest('/api/organization/departments', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        showToast('Department created', 'success');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save department', 'error');
    }
  };

  const handleDelete = async (d: DepartmentRef) => {
    try {
      await apiRequest(`/api/organization/departments/${d._id}`, { method: 'DELETE' });
      showToast(`Deleted department ${d.name}`, 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Cannot delete department', 'error');
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Departments
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Organizational units, department leadership, and headcount distribution.
            </p>
          </div>
          {isHrAdmin && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-blue-500 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Department</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => {
              const head = typeof dept.headId === 'object' ? dept.headId : null;
              return (
                <div
                  key={dept._id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs text-blue-600 dark:text-blue-400">
                          {dept.code}
                        </span>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white mt-0.5">
                          {dept.name}
                        </h2>
                      </div>
                      {isHrAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(dept)}
                            aria-label={`Edit ${dept.name}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(dept)}
                            aria-label={`Delete ${dept.name}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                      {dept.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {head ? (
                        <>
                          <Avatar src={head.avatarUrl} name={head.fullName} size="sm" />
                          <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                            {head.fullName}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400">No head assigned</span>
                      )}
                    </div>
                    <div className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
                      <Users className="w-3.5 h-3.5" />
                      <span>{dept.employeeCount || 0}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Department' : 'Add Department'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label htmlFor="dept-name" className="block text-xs font-medium mb-1">
                Department Name
              </label>
              <input
                id="dept-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <div>
              <label htmlFor="dept-code" className="block text-xs font-medium mb-1">
                Code
              </label>
              <input
                id="dept-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ENG"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono uppercase"
              />
            </div>
          </div>
          <div>
            <label htmlFor="dept-head" className="block text-xs font-medium mb-1">
              Department Head
            </label>
            <select
              id="dept-head"
              value={headId}
              onChange={(e) => setHeadId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            >
              <option value="">Unassigned</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.fullName} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dept-desc" className="block text-xs font-medium mb-1">
              Description
            </label>
            <textarea
              id="dept-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
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
              Save Department
            </button>
          </div>
        </form>
      </Modal>
    </PageTransition>
  );
}
