import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageTransition } from '../animations/motion';
import { Modal } from '../components/Modal';
import type { DepartmentRef, DesignationRef } from '../types/hr';

export function DesignationsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isHrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_ADMIN';

  const [designations, setDesignations] = useState<DesignationRef[]>([]);
  const [departments, setDepartments] = useState<DepartmentRef[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DesignationRef | null>(null);
  const [name, setName] = useState('');
  const [level, setLevel] = useState(5);
  const [departmentId, setDepartmentId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [desigRes, deptRes] = await Promise.all([
        apiRequest<{ items: DesignationRef[] }>('/api/organization/designations'),
        apiRequest<{ items: DepartmentRef[] }>('/api/organization/departments'),
      ]);
      setDesignations(desigRes.items);
      setDepartments(deptRes.items);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load designations', 'error');
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
    setLevel(5);
    setDepartmentId(departments[0]?._id || '');
    setModalOpen(true);
  };

  const openEdit = (d: DesignationRef) => {
    setEditing(d);
    setName(d.name);
    setLevel(d.level);
    setDepartmentId(typeof d.departmentId === 'string' ? d.departmentId : d.departmentId?._id || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = { name, level: Number(level), departmentId };
      if (editing) {
        await apiRequest(`/api/organization/designations/${editing._id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        showToast('Designation updated', 'success');
      } else {
        await apiRequest('/api/organization/designations', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        showToast('Designation created', 'success');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save designation', 'error');
    }
  };

  const handleDelete = async (d: DesignationRef) => {
    try {
      await apiRequest(`/api/organization/designations/${d._id}`, { method: 'DELETE' });
      showToast(`Deleted ${d.name}`, 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Cannot delete designation', 'error');
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Designations &amp; Job Levels
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Role hierarchy, career levels, and department mapping.
            </p>
          </div>
          {isHrAdmin && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-blue-500 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Designation</span>
            </button>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <th className="py-3 px-5">Title</th>
                <th className="py-3 px-5">Department</th>
                <th className="py-3 px-5">Level</th>
                <th className="py-3 px-5 text-right">Assigned Staff</th>
                {isHrAdmin && <th className="py-3 px-5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                    Loading designations...
                  </td>
                </tr>
              ) : (
                designations.map((d) => {
                  const deptName = typeof d.departmentId === 'object' ? d.departmentId?.name : '-';
                  return (
                    <tr key={d._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-5 font-medium text-slate-900 dark:text-slate-100">
                        {d.name}
                      </td>
                      <td className="py-3 px-5 text-xs text-slate-600 dark:text-slate-300">
                        {deptName}
                      </td>
                      <td className="py-3 px-5 font-mono text-xs tabular-nums text-blue-600 dark:text-blue-400">
                        Level {d.level}
                      </td>
                      <td className="py-3 px-5 font-mono text-xs tabular-nums text-right text-slate-600 dark:text-slate-300">
                        {d.employeeCount || 0}
                      </td>
                      {isHrAdmin && (
                        <td className="py-3 px-5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(d)}
                              aria-label={`Edit ${d.name}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(d)}
                              aria-label={`Delete ${d.name}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Designation' : 'Add Designation'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="desig-name" className="block text-xs font-medium mb-1">
              Designation Name
            </label>
            <input
              id="desig-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="desig-dept" className="block text-xs font-medium mb-1">
                Department
              </label>
              <select
                id="desig-dept"
                required
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              >
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="desig-level" className="block text-xs font-medium mb-1">
                Level (1-12)
              </label>
              <input
                id="desig-level"
                type="number"
                min={1}
                max={12}
                required
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tabular-nums"
              />
            </div>
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
              Save Designation
            </button>
          </div>
        </form>
      </Modal>
    </PageTransition>
  );
}
