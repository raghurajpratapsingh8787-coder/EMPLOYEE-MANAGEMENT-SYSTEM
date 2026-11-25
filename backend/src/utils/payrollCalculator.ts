export interface PayrollComponents {
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
}

export interface PayrollCalculationResult {
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Computes configurable Gross and Net salary.
 * Gross Salary = Basic Salary + Allowances + Bonus
 * Net Salary = Gross Salary - Deductions
 * Statutory tax/compliance rules are intentionally NOT assumed unless explicitly configured.
 */
export function calculatePayroll(components: PayrollComponents): PayrollCalculationResult {
  const { basicSalary, allowances, bonus, deductions } = components;

  if (
    !Number.isFinite(basicSalary) ||
    !Number.isFinite(allowances) ||
    !Number.isFinite(bonus) ||
    !Number.isFinite(deductions)
  ) {
    throw new Error('All payroll numeric components must be finite numbers');
  }

  if (basicSalary < 0 || allowances < 0 || bonus < 0 || deductions < 0) {
    throw new Error('Payroll components cannot be negative');
  }

  const grossSalary = roundCurrency(basicSalary + allowances + bonus);
  const netSalary = roundCurrency(Math.max(0, grossSalary - deductions));

  return {
    basicSalary: roundCurrency(basicSalary),
    allowances: roundCurrency(allowances),
    bonus: roundCurrency(bonus),
    deductions: roundCurrency(deductions),
    grossSalary,
    netSalary,
  };
}

export function summarizePayrollBatch(records: PayrollCalculationResult[]): {
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  count: number;
} {
  let totalGross = 0;
  let totalNet = 0;
  let totalDeductions = 0;

  for (const r of records) {
    totalGross += r.grossSalary;
    totalNet += r.netSalary;
    totalDeductions += r.deductions;
  }

  return {
    totalGross: roundCurrency(totalGross),
    totalNet: roundCurrency(totalNet),
    totalDeductions: roundCurrency(totalDeductions),
    count: records.length,
  };
}
