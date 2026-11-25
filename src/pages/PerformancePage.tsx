import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Star, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AnimatedCounter, PageTransition } from '../animations/motion';
import { Avatar } from '../components/Avatar';
import { StatusLabel } from '../components/StatusLabel';
import { Modal } from '../components/Modal';
import type { EmployeeRecord, PerformanceReviewRecord } from '../types/hr';

export function PerformancePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canCreate =
    user?.role === 'SUPER_ADMIN' || user?.role === 'HR_ADMIN' || user?.role === 'MANAGER';

  const [reviews, setReviews] = useState<PerformanceReviewRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [empId, setEmpId] = useState('');
  const [reviewPeriod, setReviewPeriod] = useState('Q4 2026');
  const [reviewDate, setReviewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rating, setRating] = useState(4.5);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('2026-12-31');
  const [goalPct, setGoalPct] = useState(80);
  const [feedback, setFeedback] = useState('');
  const [strengths, setStrengths] = useState('');
  const [areasForGrowth, setAreasForGrowth] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ items: PerformanceReviewRecord[] }>('/api/performance');
      setReviews(res.items);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load performance reviews', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (canCreate) {
      apiRequest<{ items: EmployeeRecord[] }>('/api/employees?limit=100')
        .then((res) => {
          setEmployees(res.items);
          if (res.items.length > 0 && !empId) setEmpId(res.items[0]._id);
        })
        .catch(() => {});
    }
  }, [canCreate, empId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/performance', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: empId,
          reviewPeriod,
          reviewDate,
          rating: Number(rating),
          goals: goalTitle
            ? [
                {
                  title: goalTitle,
                  targetDate: goalTargetDate,
                  completionPct: Number(goalPct),
                  status: Number(goalPct) >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
                },
              ]
            : [],
          feedback,
          strengths,
          areasForGrowth,
          status: 'SHARED',
        }),
      });
      showToast('Performance review published', 'success');
      setModalOpen(false);
      setGoalTitle('');
      setFeedback('');
      setStrengths('');
      setAreasForGrowth('');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save review', 'error');
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await apiRequest(`/api/performance/${id}/acknowledge`, { method: 'PATCH' });
      showToast('Review acknowledged', 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to acknowledge review', 'error');
    }
  };

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
  const allGoals = reviews.flatMap((r) => r.goals || []);
  const avgGoalCompletion =
    allGoals.length > 0
      ? Math.round(allGoals.reduce((sum, g) => sum + g.completionPct, 0) / allGoals.length)
      : 0;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Performance Management
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Confidential evaluations, goal completion tracking, and manager feedback.
            </p>
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-blue-500 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Review</span>
            </button>
          )}
        </div>

        {/* Overview KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
            <div className="text-xs text-slate-500">Reviews Recorded</div>
            <div className="mt-1 text-2xl font-bold">
              <AnimatedCounter value={reviews.length} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
            <div className="text-xs text-slate-500">Average Rating</div>
            <div className="mt-1 text-2xl font-bold">
              <AnimatedCounter value={avgRating} decimals={2} suffix=" / 5" />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
            <div className="text-xs text-slate-500">Avg Goal Completion</div>
            <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              <AnimatedCounter value={avgGoalCompletion} suffix="%" />
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {loading ? (
          <div className="h-40 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-10 text-center text-sm text-slate-500">
            No performance reviews visible for your role.
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => {
              const isSubject = user?.employeeId === rev.employeeId?._id;
              return (
                <div
                  key={rev._id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={rev.employeeId?.avatarUrl} name={rev.employeeId?.fullName || 'Emp'} size="md" />
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {rev.employeeId?.fullName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {rev.employeeId?.departmentId?.name} · {rev.reviewPeriod} · Reviewed by{' '}
                          {rev.reviewerId?.fullName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 font-mono text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">
                        <Star className="w-4 h-4 fill-current" />
                        {rev.rating.toFixed(1)}
                      </span>
                      <StatusLabel status={rev.status} />
                      {isSubject && rev.status === 'SHARED' && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(rev._id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Acknowledge</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {rev.feedback}
                  </p>

                  {(rev.strengths || rev.areasForGrowth) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                      {rev.strengths && (
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">Strengths: </span>
                          <span className="text-slate-600 dark:text-slate-400">{rev.strengths}</span>
                        </div>
                      )}
                      {rev.areasForGrowth && (
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">Growth Focus: </span>
                          <span className="text-slate-600 dark:text-slate-400">{rev.areasForGrowth}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {rev.goals && rev.goals.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Objectives &amp; Goals
                      </div>
                      {rev.goals.map((g, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-4 text-xs">
                          <span className="text-slate-700 dark:text-slate-200 truncate">{g.title}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${g.completionPct}%` }}
                              />
                            </div>
                            <span className="font-mono tabular-nums w-9 text-right">
                              {g.completionPct}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Performance Review"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label htmlFor="perf-emp" className="block text-xs font-medium mb-1">
                Employee
              </label>
              <select
                id="perf-emp"
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              >
                {employees.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.fullName} ({e.employeeId})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="perf-period" className="block text-xs font-medium mb-1">
                Review Period
              </label>
              <input
                id="perf-period"
                required
                value={reviewPeriod}
                onChange={(e) => setReviewPeriod(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <div>
              <label htmlFor="perf-rating" className="block text-xs font-medium mb-1">
                Rating (1.0 - 5.0)
              </label>
              <input
                id="perf-rating"
                type="number"
                step="0.1"
                min={1}
                max={5}
                required
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label htmlFor="perf-goal" className="block text-xs font-medium mb-1">
                Key Goal
              </label>
              <input
                id="perf-goal"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="e.g., Ship Q4 platform reliability milestone"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <div>
              <label htmlFor="perf-pct" className="block text-xs font-medium mb-1">
                Completion %
              </label>
              <input
                id="perf-pct"
                type="number"
                min={0}
                max={100}
                value={goalPct}
                onChange={(e) => setGoalPct(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tabular-nums"
              />
            </div>
          </div>

          <input type="hidden" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
          <input type="hidden" value={goalTargetDate} onChange={(e) => setGoalTargetDate(e.target.value)} />

          <div>
            <label htmlFor="perf-feedback" className="block text-xs font-medium mb-1">
              Manager Feedback
            </label>
            <textarea
              id="perf-feedback"
              required
              minLength={5}
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="perf-strengths" className="block text-xs font-medium mb-1">
                Strengths
              </label>
              <input
                id="perf-strengths"
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <div>
              <label htmlFor="perf-growth" className="block text-xs font-medium mb-1">
                Areas for Growth
              </label>
              <input
                id="perf-growth"
                value={areasForGrowth}
                onChange={(e) => setAreasForGrowth(e.target.value)}
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
              Publish Review
            </button>
          </div>
        </form>
      </Modal>
    </PageTransition>
  );
}
