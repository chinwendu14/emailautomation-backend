import mongoose, { Document, Schema, Types } from "mongoose";

export type EmailLogStatus = "sent" | "failed";

export interface IEmailLog extends Document {
  userId: Types.ObjectId;
  emailAccountId: Types.ObjectId;

  provider: "gmail" | "outlook" | "smtp";

  from: string;
  to: string;
  subject: string;
  body: string;

  status: EmailLogStatus;

  messageId?: string;
  threadId?: string;

  errorMessage?: string;

  sentAt?: Date;
}

const emailLogSchema = new Schema<IEmailLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    emailAccountId: {
      type: Schema.Types.ObjectId,
      ref: "EmailAccount",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["gmail", "outlook", "smtp"],
      required: true,
    },

    from: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    to: {
      type: String,
      required: true,
      trim: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    body: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["sent", "failed"],
      required: true,
      index: true,
    },

    messageId: {
      type: String,
    },

    threadId: {
      type: String,
    },

    errorMessage: {
      type: String,
    },

    sentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

const EmailLog = mongoose.model<IEmailLog>("EmailLog", emailLogSchema);

export default EmailLog;
