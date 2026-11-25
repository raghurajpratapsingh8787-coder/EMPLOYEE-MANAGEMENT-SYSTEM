import mongoose, { Schema, Document } from 'mongoose';

export interface IDesignation extends Document {
  name: string;
  level: number;
  departmentId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DesignationSchema = new Schema<IDesignation>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      default: 3,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

DesignationSchema.index({ name: 1, departmentId: 1 }, { unique: true });

export const Designation = mongoose.model<IDesignation>('Designation', DesignationSchema);
