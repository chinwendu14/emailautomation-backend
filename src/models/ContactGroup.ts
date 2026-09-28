import mongoose, { Document, Schema, Types } from "mongoose";

export interface IContactGroup extends Document {
  userId: Types.ObjectId;
  name: string;
  description?: string;
}

const contactGroupSchema = new Schema<IContactGroup>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// A user cannot have two groups with the same name
contactGroupSchema.index({ userId: 1, name: 1 }, { unique: true });

const ContactGroup = mongoose.model<IContactGroup>(
  "ContactGroup",
  contactGroupSchema,
);

export default ContactGroup;
