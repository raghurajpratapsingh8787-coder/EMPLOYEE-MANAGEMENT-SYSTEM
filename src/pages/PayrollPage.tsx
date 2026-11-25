import React, { useCallback, useEffect, useState } from 'react';
import { Download, Plus, CheckCircle2, Layers } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageTransition } from '../animations/motion';
import { StatusLabel } from '../components/StatusLabel';
import { Modal } from '../components/Modal';
import { downloadPayslipPdf } from '../utils/pdfPayslip';
import type { EmployeeRecord, PayrollRecord } from '../types/hr';

export function PayrollPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isHrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_ADMIN';

  const now = new Date();
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [year, setYear] = useState(now.getUTCFullYear());
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [summary, setSummary] = useState({ totalGross: 0, totalNet: 0, totalDeductions: 0, count: 0 });
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);

  // Individual payroll form
  const [empId, setEmpId] = useState('');
  const [basicSalary, setBasicSalary] = useState(8000);
  const [allowances, setAllowances] = useState(960);
  const [bonus, setBonus] = useState(0);
  const [deductions, setDeductions] = useState(640);
  const [notes, setNotes] = useState('');

  // Batch configuration
  const [allowanceRatePct, setAllowanceRatePct] = useState(12);
  const [deductionRatePct, setDeductionRatePct] = useState(8);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isHrAdmin) {
        const res = await apiRequest<{
          items: PayrollRecord[];
          summary: { totalGross: number; totalNet: number; totalDeductions: number; count: number };
        }>(`/api/payroll?month=${month}&year=${year}`);
        setRecords(res.items);
        setSummary(res.summary);
      } else {
        const res = await apiRequest<{ items: PayrollRecord[] }>('/api/payroll/my');
        setRecords(res.items);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load payroll', 'error');
    } finally {
      setLoading(false);
    }
  }, [isHrAdmin, month, year, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isHrAdmin) {
      apiRequest<{ items: EmployeeRecord[] }>('/api/employees?limit=100')
        .then((res) => {
          setEmployees(res.items);
          if (res.items.length > 0 && !empId) {
            setEmpId(res.items[0]._id);
            const sal = res.items[0].salary || 8000;
            setBasicSalary(sal);
            setAllowances(Math.round(sal * 0.12));
            setDeductions(Math.round(sal * 0.08));
          }
        })
        .catch(() => {});
    }
  }, [isHrAdmin, empId]);

  const previewGross = Math.max(0, Number(basicSalary) + Number(allowances) + Number(bonus));
  const previewNet = Math.max(0, previewGross - Number(deductions));

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/payroll', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: empId,
          periodMonth: month,
          periodYear: year,
          basicSalary: Number(basicSalary),
          allowances: Number(allowances),
          bonus: Number(bonus),
          deductions: Number(deductions),
          notes,
        }),
      });
      showToast('Payroll record saved', 'success');
      setCreateOpen(false);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save payroll record', 'error');
    }
  };

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{ generatedCount: number }>('/api/payroll/generate-batch', {
        method: 'POST',
        body: JSON.stringify({
          periodMonth: month,
          periodYear: year,
          allowanceRatePct: Number(allowanceRatePct),
          deductionRatePct: Number(deductionRatePct),
        }),
      });
      showToast(`Generated ${res.generatedCount} draft payroll record(s)`, 'success');
      setBatchOpen(false);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Batch generation failed', 'error');
    }
  };

  const handleStatusUpdate = async (id: string, status: 'APPROVED' | 'PAID') => {
    try {
      await apiRequest(`/api/payroll/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      showToast(`Payroll marked ${status.toLowerCase()}`, 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Status update failed', 'error');
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isHrAdmin ? 'Payroll Administration' : 'My Payslips'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Configurable compensation ledger (Gross = Basic + Allowances + Bonus · Net = Gross - Deductions).
            </p>
          </div>

          {isHrAdmin && (
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 shrink-0">
              <select
                aria-label="Payroll month"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-xs font-medium shrink-0"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Month {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
              <input
                type="number"
                aria-label="Payroll year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-20 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-xs font-mono tabular-nums shrink-0"
              />
              <button
                type="button"
                onClick={() => setBatchOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Generate Batch</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Entry</span>
              </button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/50 px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300">
          Disclosure: Payroll calculations use configurable allowance and deduction entries. Statutory jurisdiction taxes are not auto-calculated unless configured externally.
        </div>

        {isHrAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
              <div className="text-xs text-slate-500">Records in Period</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums">{summary.count}</div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
              <div className="text-xs text-slate-500">Total Gross Payroll</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums">
                ${summary.totalGross.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
              <div className="text-xs text-slate-500">Total Deductions</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-amber-600">
                ${summary.totalDeductions.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
              <div className="text-xs text-slate-500">Total Net Disbursement</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-600">
                ${summary.totalNet.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-right">Basic</th>
                  <th className="py-3 px-4 text-right">Allowances</th>
                  <th className="py-3 px-4 text-right">Bonus</th>
                  <th className="py-3 px-4 text-right">Deductions</th>
                  <th className="py-3 px-4 text-right">Gross</th>
                  <th className="py-3 px-4 text-right">Net</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500">
                      Loading payroll records...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500">
                      No payroll records found for this period.
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr key={rec._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {rec.employeeId?.fullName}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {rec.employeeId?.employeeId}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums">
                        {rec.periodYear}-{String(rec.periodMonth).padStart(2, '0')}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right">
                        ${rec.basicSalary.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right">
                        ${rec.allowances.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right">
                        ${rec.bonus.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-rose-600">
                        -${rec.deductions.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right font-medium">
                        ${rec.grossSalary.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right font-semibold text-slate-900 dark:text-white">
                        ${rec.netSalary.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <StatusLabel status={rec.status} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {isHrAdmin && rec.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => handleStatusUpdate(rec._id, 'APPROVED')}
                              className="px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-500"
                            >
                              Approve
                            </button>
                          )}
                          {isHrAdmin && rec.status === 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => handleStatusUpdate(rec._id, 'PAID')}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-500"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Mark Paid</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              downloadPayslipPdf(rec);
                              showToast('Payslip PDF downloaded', 'success');
                            }}
                            aria-label={`Download PDF payslip for ${rec.employeeId?.fullName}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Download className="w-3 h-3" />
                            <span>PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Individual Payroll Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Configure Employee Payroll"
        subtitle={`Period ${year}-${String(month).padStart(2, '0')}`}
      >
        <form onSubmit={handleSaveRecord} className="space-y-4">
          <div>
            <label htmlFor="pay-emp" className="block text-xs font-medium mb-1">
              Employee
            </label>
            <select
              id="pay-emp"
              value={empId}
              onChange={(e) => {
                const selected = employees.find((item) => item._id === e.target.value);
                setEmpId(e.target.value);
                if (selected?.salary !== undefined) {
                  setBasicSalary(selected.salary);
                  setAllowances(Math.round(selected.salary * 0.12));
                  setDeductions(Math.round(selected.salary * 0.08));
                }
              }}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            >
              {employees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.fullName} ({e.employeeId})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pay-basic" className="block text-xs font-medium mb-1">
                Basic Salary
              </label>
              <input
                id="pay-basic"
                type="number"
                min={0}
                step="0.01"
                value={basicSalary}
                onChange={(e) => setBasicSalary(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="pay-allowances" className="block text-xs font-medium mb-1">
                Allowances
              </label>
              <input
                id="pay-allowances"
                type="number"
                min={0}
                step="0.01"
                value={allowances}
                onChange={(e) => setAllowances(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="pay-bonus" className="block text-xs font-medium mb-1">
                Bonus
              </label>
              <input
                id="pay-bonus"
                type="number"
                min={0}
                step="0.01"
                value={bonus}
                onChange={(e) => setBonus(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="pay-deductions" className="block text-xs font-medium mb-1">
                Deductions
              </label>
              <input
                id="pay-deductions"
                type="number"
                min={0}
                step="0.01"
                value={deductions}
                onChange={(e) => setDeductions(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3.5 flex items-center justify-between text-xs border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-slate-500">Gross:</span>{' '}
              <span className="font-mono tabular-nums font-semibold">
                ${previewGross.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Net Payable:</span>{' '}
              <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                ${previewNet.toLocaleString()}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="pay-notes" className="block text-xs font-medium mb-1">
              Notes
            </label>
            <input
              id="pay-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium"
            >
              Save Payroll Record
            </button>
          </div>
        </form>
      </Modal>

      {/* Batch Generate Modal */}
      <Modal
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        title="Generate Monthly Payroll Batch"
        subtitle={`Creates draft payroll entries for active staff missing ${year}-${String(month).padStart(2, '0')}.`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleGenerateBatch} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="batch-allow" className="block text-xs font-medium mb-1">
                Configurable Allowance (%)
              </label>
              <input
                id="batch-allow"
                type="number"
                min={0}
                max={100}
                value={allowanceRatePct}
                onChange={(e) => setAllowanceRatePct(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="batch-deduct" className="block text-xs font-medium mb-1">
                Configurable Deduction (%)
              </label>
              <input
                id="batch-deduct"
                type="number"
                min={0}
                max={100}
                value={deductionRatePct}
                onChange={(e) => setDeductionRatePct(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tabular-nums"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setBatchOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium"
            >
              Generate Drafts
            </button>
          </div>
        </form>
      </Modal>
    </PageTransition>
  );
}
