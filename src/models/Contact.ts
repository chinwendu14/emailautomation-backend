import mongoose, { Document, Schema, Types } from "mongoose";

export interface IContact extends Document {
  userId: Types.ObjectId;
  firstName: string;
  lastName?: string;
  email: string;
  company?: string;
  phone?: string;
}

const contactSchema = new Schema<IContact>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    company: {
      type: String,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

contactSchema.index({ userId: 1, email: 1 }, { unique: true });

const Contact = mongoose.model<IContact>("Contact", contactSchema);

export default Contact;
