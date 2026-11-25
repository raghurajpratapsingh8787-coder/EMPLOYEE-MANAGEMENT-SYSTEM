import mongoose, { Schema, Document } from 'mongoose';

export type NotificationCategory = 'LEAVE' | 'PAYROLL' | 'ATTENDANCE' | 'PERFORMANCE' | 'SYSTEM';

export interface INotification extends Document {
  recipientUserId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  category: NotificationCategory;
  isRead: boolean;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['LEAVE', 'PAYROLL', 'ATTENDANCE', 'PERFORMANCE', 'SYSTEM'],
      default: 'SYSTEM',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    link: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
