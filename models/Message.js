// models/Message.js

import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
{
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business"
  },

  message: {
    type: String,
    required: true
  },

  isRead: {
    type: Boolean,
    default: false
  }

},
{ timestamps: true }
);

export default mongoose.model("Message", messageSchema);