import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
  revokedAt?: Date;
  createdAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    userAgent: String,
    ipAddress: String,
    revokedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Session = mongoose.model<ISession>('Session', SessionSchema);
