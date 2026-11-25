import mongoose, { Schema, Document } from 'mongoose';
import type { UserRole } from '../utils/rbac';

export interface IUser extends Document {
  email: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
  employeeId?: mongoose.Types.ObjectId;
  isActive: boolean;
  lastLogin?: Date;
  failedLoginAttempts: number;
  lockUntil?: Date;
  resetTokenHash?: string;
  resetTokenExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'],
      default: 'EMPLOYEE',
      required: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    resetTokenHash: {
      type: String,
      select: false,
    },
    resetTokenExpires: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
