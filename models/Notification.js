// models/Notification.js

import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  title: {
    type: String,
    required: true
  },

  message: {
    type: String
  },

  type: {
    type: String,
    enum: ["lead","system","payment","review"],
    default: "system"
  },

  isRead: {
    type: Boolean,
    default: false
  }

},
{ timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);