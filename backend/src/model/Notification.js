import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  type: {
    type: String,
    enum: ["REMINDER", "MESSAGE", "NEW_LISTING", "ORDER"],
    required: true
  },

  referenceModel: {
    type: String,
    enum: ["Reminder", "Message", "Listing", "Order"],
    required: true
  },

  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "referenceModel"
  },

  isRead: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification