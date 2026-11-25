import mongoose, { Schema, Document } from 'mongoose';
import type { LeaveStatus, LeaveType } from '../utils/leaveCalculator';

export interface ILeaveRequest extends Document {
  employeeId: mongoose.Types.ObjectId;
  leaveType: LeaveType;
  customTypeLabel?: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewComment?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    leaveType: {
      type: String,
      enum: ['CASUAL', 'SICK', 'EARNED', 'UNPAID', 'OTHER'],
      required: true,
    },
    customTypeLabel: {
      type: String,
      trim: true,
    },
    startDate: {
      type: String,
      required: true,
      index: true,
    },
    endDate: {
      type: String,
      required: true,
      index: true,
    },
    totalDays: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewComment: {
      type: String,
      trim: true,
    },
    reviewedAt: Date,
  },
  { timestamps: true }
);

export const LeaveRequest = mongoose.model<ILeaveRequest>('LeaveRequest', LeaveRequestSchema);
