import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["lowStock", "outOfStock", "overdueTool", "newStock", "borrowTool", "stockOut", "system"],
      required: [true, "Notification type is required"],
    },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    reference: {
      modelType: {
        type: String,
        enum: ["SparePart", "Consumable", "BorrowedTool", "Transaction", "DailyConsumption", "ToolInventory"],
      },
      modelId: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ read: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ severity: 1, read: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
