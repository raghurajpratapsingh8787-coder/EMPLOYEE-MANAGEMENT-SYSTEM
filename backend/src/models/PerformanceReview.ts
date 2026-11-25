import mongoose, { Schema, Document } from 'mongoose';

export interface IGoalItem {
  title: string;
  targetDate: string;
  completionPct: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface IPerformanceReview extends Document {
  employeeId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;
  reviewPeriod: string;
  reviewDate: string;
  rating: number; // 1 to 5
  goals: IGoalItem[];
  feedback: string;
  strengths: string;
  areasForGrowth: string;
  status: 'DRAFT' | 'SHARED' | 'ACKNOWLEDGED';
  createdAt: Date;
  updatedAt: Date;
}

const GoalItemSchema = new Schema<IGoalItem>(
  {
    title: { type: String, required: true, trim: true },
    targetDate: { type: String, required: true },
    completionPct: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
      default: 'IN_PROGRESS',
    },
  },
  { _id: false }
);

const PerformanceReviewSchema = new Schema<IPerformanceReview>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    reviewPeriod: {
      type: String,
      required: true,
      trim: true,
    },
    reviewDate: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    goals: {
      type: [GoalItemSchema],
      default: [],
    },
    feedback: {
      type: String,
      required: true,
      trim: true,
    },
    strengths: {
      type: String,
      default: '',
      trim: true,
    },
    areasForGrowth: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SHARED', 'ACKNOWLEDGED'],
      default: 'SHARED',
      index: true,
    },
  },
  { timestamps: true }
);

export const PerformanceReview = mongoose.model<IPerformanceReview>(
  'PerformanceReview',
  PerformanceReviewSchema
);
