import React, { useCallback, useEffect, useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { PageTransition } from '../animations/motion';
import { Modal } from '../components/Modal';
import type { EmployeeRecord, UserRole } from '../types/hr';

interface AdminUserRow {
  _id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  employeeId?: { _id: string; employeeId: string; fullName: string } | null;
}

export function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [linkedEmpId, setLinkedEmpId] = useState('');

  const loadAdminData = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const [uRes, eRes] = await Promise.all([
        apiRequest<{ items: AdminUserRow[] }>('/api/dashboard/admin/users'),
        apiRequest<{ items: EmployeeRecord[] }>('/api/employees?limit=100'),
      ]);
      setUsers(uRes.items);
      setEmployees(eRes.items);
    } catch {
      // Ignore
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/dashboard/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email,
          fullName,
          password,
          role,
          employeeId: linkedEmpId || undefined,
        }),
      });
      showToast('User account created', 'success');
      setModalOpen(false);
      setEmail('');
      setFullName('');
      setPassword('');
      loadAdminData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to create user', 'error');
    }
  };

  const handleRoleChange = async (id: string, newRole: UserRole) => {
    try {
      await apiRequest(`/api/dashboard/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      showToast('User role updated', 'success');
      loadAdminData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update role', 'error');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await apiRequest(`/api/dashboard/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
      showToast(isActive ? 'Account activated' : 'Account deactivated & sessions revoked', 'info');
      loadAdminData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update account status', 'error');
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Settings &amp; Access Control
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Appearance preferences and role-based user governance.
          </p>
        </div>

        {/* Appearance Card */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Workspace Theme
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose between crisp light slate or deep midnight navy surfaces.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium ${
                theme === 'light'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Light Mode
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium ${
                theme === 'dark'
                  ? 'bg-[#1E293B] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Dark Mode
            </button>
          </div>
        </div>

        {/* Super Admin User Access Management */}
        {isSuperAdmin && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    User Accounts &amp; Role Assignment
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Provision logins for HR Admins, Managers, and Employees.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Provision User</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Linked Employee</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td className="py-3 px-4 font-medium">{u.fullName}</td>
                      <td className="py-3 px-4 text-slate-500">{u.email}</td>
                      <td className="py-3 px-4 font-mono">
                        {u.employeeId ? `${u.employeeId.employeeId}` : 'Unlinked'}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          aria-label={`Role for ${u.email}`}
                          value={u.role}
                          onChange={(e) => handleRoleChange(u._id, e.target.value as UserRole)}
                          className="h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        >
                          <option value="SUPER_ADMIN">Super Admin</option>
                          <option value="HR_ADMIN">HR Admin</option>
                          <option value="MANAGER">Manager</option>
                          <option value="EMPLOYEE">Employee</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u._id, !u.isActive)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                            u.isActive
                              ? 'border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {u.isActive ? 'Active (Disable)' : 'Disabled (Enable)'}
                        </button>
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
        title="Provision User Account"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label htmlFor="usr-emp" className="block text-xs font-medium mb-1">
              Link to Employee Profile (optional)
            </label>
            <select
              id="usr-emp"
              value={linkedEmpId}
              onChange={(e) => {
                const selected = employees.find((item) => item._id === e.target.value);
                setLinkedEmpId(e.target.value);
                if (selected) {
                  setFullName(selected.fullName);
                  setEmail(selected.email);
                }
              }}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            >
              <option value="">No employee link</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.fullName} ({e.employeeId})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="usr-name" className="block text-xs font-medium mb-1">
              Full Name
            </label>
            <input
              id="usr-name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>
          <div>
            <label htmlFor="usr-email" className="block text-xs font-medium mb-1">
              Email
            </label>
            <input
              id="usr-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="usr-role" className="block text-xs font-medium mb-1">
                Role
              </label>
              <select
                id="usr-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              >
                <option value="HR_ADMIN">HR Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="EMPLOYEE">Employee</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
            <div>
              <label htmlFor="usr-pw" className="block text-xs font-medium mb-1">
                Initial Password
              </label>
              <input
                id="usr-pw"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
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
              Create Account
            </button>
          </div>
        </form>
      </Modal>
    </PageTransition>
  );
}
