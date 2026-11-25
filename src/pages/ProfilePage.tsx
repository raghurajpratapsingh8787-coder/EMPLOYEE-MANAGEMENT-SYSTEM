import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageTransition } from '../animations/motion';
import { Avatar } from '../components/Avatar';

export function ProfilePage() {
  const { user, employee, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(employee?.phone || '');
  const [address, setAddress] = useState(employee?.address || '');
  const [city, setCity] = useState(employee?.city || '');
  const [state, setState] = useState(employee?.state || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(user?.fullName || '');
    setPhone(employee?.phone || '');
    setAddress(employee?.address || '');
    setCity(employee?.city || '');
    setState(employee?.state || '');
  }, [user, employee]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName,
          phone: phone || undefined,
          address: address || undefined,
          city: city || undefined,
          state: state || undefined,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      await refreshProfile();
      setCurrentPassword('');
      setNewPassword('');
      showToast('Profile updated successfully', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm';

  return (
    <PageTransition>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            My Account Profile
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Update your contact details and account password.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 flex items-center gap-4">
          <Avatar src={employee?.avatarUrl} name={user?.fullName || 'User'} size="lg" />
          <div>
            <div className="text-base font-semibold text-slate-900 dark:text-white">
              {user?.fullName}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {user?.email} · Role: {user?.role.replace('_', ' ')}
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSave}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prof-name" className="block text-xs font-medium mb-1">
                Full Name
              </label>
              <input
                id="prof-name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="prof-phone" className="block text-xs font-medium mb-1">
                Phone
              </label>
              <input
                id="prof-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="prof-addr" className="block text-xs font-medium mb-1">
                Address
              </label>
              <input
                id="prof-addr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="prof-city" className="block text-xs font-medium mb-1">
                City
              </label>
              <input
                id="prof-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="prof-state" className="block text-xs font-medium mb-1">
                State
              </label>
              <input
                id="prof-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-semibold mb-3">Change Password (Optional)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prof-cur-pw" className="block text-xs font-medium mb-1">
                  Current Password
                </label>
                <input
                  id="prof-cur-pw"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="prof-new-pw" className="block text-xs font-medium mb-1">
                  New Password (min 8 chars)
                </label>
                <input
                  id="prof-new-pw"
                  type="password"
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </PageTransition>
  );
}
