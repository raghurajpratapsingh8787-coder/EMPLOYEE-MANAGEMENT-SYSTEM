import mongoose, { Schema, Document } from 'mongoose';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';

export interface IEmployee extends Document {
  employeeId: string;
  fullName: string;
  avatarUrl?: string;
  avatarFile?: string;
  email: string;
  phone: string;
  gender: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say';
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  departmentId: mongoose.Types.ObjectId;
  designationId: mongoose.Types.ObjectId;
  joiningDate: string;
  employmentType: EmploymentType;
  salary: number;
  reportingManagerId?: mongoose.Types.ObjectId;
  status: EmployeeStatus;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    avatarFile: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
      default: 'Prefer not to say',
    },
    dateOfBirth: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
    designationId: {
      type: Schema.Types.ObjectId,
      ref: 'Designation',
      required: true,
      index: true,
    },
    joiningDate: {
      type: String,
      required: true,
      index: true,
    },
    employmentType: {
      type: String,
      enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'],
      required: true,
      default: 'FULL_TIME',
    },
    salary: {
      type: Number,
      required: true,
      min: 0,
    },
    reportingManagerId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'],
      required: true,
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true }
);

EmployeeSchema.index({ fullName: 'text', email: 'text', employeeId: 'text' });

export const Employee = mongoose.model<IEmployee>('Employee', EmployeeSchema);
