import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageTransition } from '../animations/motion';
import type { NotificationRecord } from '../types/hr';

export function NotificationsPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ items: NotificationRecord[] }>('/api/dashboard/notifications');
      setItems(res.items);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id: string) => {
    await apiRequest(`/api/dashboard/notifications/${id}/read`, { method: 'PATCH' });
    load();
  };

  return (
    <PageTransition>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Notifications
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time alerts for leave approvals, payroll disbursement, and HR updates.
            </p>
          </div>
          {items.some((i) => !i.isRead) && (
            <button
              type="button"
              onClick={() => markRead('all')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading notifications...</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              <Bell className="w-5 h-5 mx-auto mb-2 opacity-40" />
              No notifications yet.
            </div>
          ) : (
            items.map((n) => (
              <div
                key={n._id}
                className={`p-4 flex items-start justify-between gap-4 ${
                  !n.isRead ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                      {n.category}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-400 tabular-nums">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {n.title}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">{n.message}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {n.link && (
                    <button
                      type="button"
                      onClick={() => navigate(n.link!)}
                      className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Open
                    </button>
                  )}
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => markRead(n._id)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageTransition>
  );
}
