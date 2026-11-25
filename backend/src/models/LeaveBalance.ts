import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaveBalance extends Document {
  employeeId: mongoose.Types.ObjectId;
  year: number;
  casualTotal: number;
  casualUsed: number;
  sickTotal: number;
  sickUsed: number;
  earnedTotal: number;
  earnedUsed: number;
  unpaidUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveBalanceSchema = new Schema<ILeaveBalance>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
    },
    casualTotal: { type: Number, default: 12, min: 0 },
    casualUsed: { type: Number, default: 0, min: 0 },
    sickTotal: { type: Number, default: 10, min: 0 },
    sickUsed: { type: Number, default: 0, min: 0 },
    earnedTotal: { type: Number, default: 15, min: 0 },
    earnedUsed: { type: Number, default: 0, min: 0 },
    unpaidUsed: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

LeaveBalanceSchema.index({ employeeId: 1, year: 1 }, { unique: true });

export const LeaveBalance = mongoose.model<ILeaveBalance>('LeaveBalance', LeaveBalanceSchema);
