import mongoose, { Schema, Document } from 'mongoose';

export type PayrollStatus = 'DRAFT' | 'APPROVED' | 'PAID';

export interface IPayroll extends Document {
  employeeId: mongoose.Types.ObjectId;
  periodMonth: number; // 1-12
  periodYear: number;
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  currency: string;
  configurationLabel: string;
  status: PayrollStatus;
  approvedBy?: mongoose.Types.ObjectId;
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollSchema = new Schema<IPayroll>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    periodMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    periodYear: {
      type: Number,
      required: true,
      min: 2020,
      max: 2100,
    },
    basicSalary: { type: Number, required: true, min: 0 },
    allowances: { type: Number, default: 0, min: 0 },
    bonus: { type: Number, default: 0, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    grossSalary: { type: Number, required: true, min: 0 },
    netSalary: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    configurationLabel: {
      type: String,
      default: 'Configurable Enterprise Payroll Formula (No statutory tax auto-applied)',
    },
    status: {
      type: String,
      enum: ['DRAFT', 'APPROVED', 'PAID'],
      default: 'DRAFT',
      index: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    paidAt: Date,
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

PayrollSchema.index({ employeeId: 1, periodMonth: 1, periodYear: 1 }, { unique: true });

export const Payroll = mongoose.model<IPayroll>('Payroll', PayrollSchema);
