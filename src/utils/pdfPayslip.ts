import { jsPDF } from 'jspdf';
import type { PayrollRecord } from '../types/hr';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatMoney(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function downloadPayslipPdf(record: PayrollRecord): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const monthLabel = `${MONTH_NAMES[(record.periodMonth - 1) % 12]} ${record.periodYear}`;
  const emp = record.employeeId;

  // Header banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 595, 92, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Calibre HR', 44, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text('Enterprise Compensation Statement', 44, 62);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(`Period: ${monthLabel}`, 410, 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Status: ${record.status}`, 410, 62);

  // Employee Details
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Employee Details', 44, 130);

  doc.setDrawColor(226, 232, 240);
  doc.line(44, 138, 551, 138);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Name: ${emp?.fullName || 'Employee'}`, 44, 160);
  doc.text(`Employee ID: ${emp?.employeeId || '-'}`, 44, 178);
  doc.text(`Department: ${emp?.departmentId?.name || '-'}`, 310, 160);
  doc.text(`Designation: ${emp?.designationId?.name || '-'}`, 310, 178);

  // Earnings & Deductions Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Compensation Breakdown', 44, 224);
  doc.line(44, 232, 551, 232);

  const rows: Array<[string, string]> = [
    ['Basic Salary', formatMoney(record.basicSalary, record.currency)],
    ['Allowances', formatMoney(record.allowances, record.currency)],
    ['Bonus', formatMoney(record.bonus, record.currency)],
    ['Gross Salary (Basic + Allowances + Bonus)', formatMoney(record.grossSalary, record.currency)],
    ['Deductions', `-${formatMoney(record.deductions, record.currency)}`],
  ];

  let y = 258;
  for (const [label, val] of rows) {
    const isGross = label.startsWith('Gross Salary');
    doc.setFont('helvetica', isGross ? 'bold' : 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(label, 44, y);
    doc.text(val, 551, y, { align: 'right' });
    y += 26;
  }

  // Net Salary Box
  doc.setFillColor(241, 245, 249);
  doc.rect(44, y + 6, 507, 44, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Net Payable Salary', 60, y + 32);
  doc.setFontSize(14);
  doc.text(formatMoney(record.netSalary, record.currency), 535, y + 32, { align: 'right' });

  // Configuration disclosure
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Formula Notice: ${record.configurationLabel || 'Configurable payroll formula (statutory tax rules not assumed).'}`,
    44,
    y + 78,
    { maxWidth: 507 }
  );

  const fileSafeId = (emp?.employeeId || 'EMP').replace(/[^a-zA-Z0-9_-]/g, '');
  doc.save(`Payslip_${fileSafeId}_${record.periodYear}_${String(record.periodMonth).padStart(2, '0')}.pdf`);
}
