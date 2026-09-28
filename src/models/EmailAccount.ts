import mongoose, { Document, Schema, Types } from "mongoose";

export type EmailProvider = "gmail" | "outlook" | "smtp";

export interface IEmailAccount extends Document {
  userId: Types.ObjectId;
  provider: EmailProvider;
  email: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
}

const emailAccountSchema = new Schema<IEmailAccount>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    provider: {
      type: String,
      enum: ["gmail", "outlook", "smtp"],
      required: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    accessToken: {
      type: String,
    },

    refreshToken: {
      type: String,
    },

    tokenExpiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

const EmailAccount = mongoose.model<IEmailAccount>(
  "EmailAccount",
  emailAccountSchema,
);

export default EmailAccount;
