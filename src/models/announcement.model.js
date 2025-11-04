import mongoose, { Schema } from "mongoose";

const announcementSchema = new Schema(
  {
    heading: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    footer: {
      type: String,
      trim: true,
    },
    expireAt: {
      type: Date,
      default: function () {
        const now = new Date();
        now.setMonth(now.getMonth() + 3);
        return now;
      },
    },
  },
  { timestamps: true }
);


announcementSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const Announcement = mongoose.model("Announcement", announcementSchema);

