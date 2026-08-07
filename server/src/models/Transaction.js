import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "stockIn",
        "stockOut",
        "adjustment",
        "borrowTool",
        "returnTool",
        "consumableRelease",
        "consumableStockIn",
        "consumableAdjustment",
      ],
      required: [true, "Transaction type is required"],
    },
    itemType: {
      type: String,
      enum: ["sparePart", "consumable", "tool"],
      default: "sparePart",
    },
    sparePart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SparePart",
    },
    consumable: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consumable",
    },
    tool: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ToolInventory",
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    unitPrice: {
      type: Number,
      min: [0, "Unit price cannot be negative"],
      default: 0,
    },
    balanceAfter: {
      type: Number,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    employeeName: {
      type: String,
      trim: true,
      maxlength: [150, "Employee name cannot exceed 150 characters"],
    },
    department: {
      type: String,
      trim: true,
      maxlength: [100, "Department cannot exceed 100 characters"],
    },
    machine: {
      type: String,
      trim: true,
      maxlength: [150, "Machine cannot exceed 150 characters"],
    },
    receivedBy: {
      type: String,
      trim: true,
      maxlength: [150, "Received by cannot exceed 150 characters"],
    },
    releasedBy: {
      type: String,
      trim: true,
      maxlength: [150, "Released by cannot exceed 150 characters"],
    },
    reference: {
      type: String,
      trim: true,
      maxlength: [100, "Reference cannot exceed 100 characters"],
    },
    adjustmentReason: {
      type: String,
      trim: true,
      maxlength: [500, "Adjustment reason cannot exceed 500 characters"],
    },
    adjustmentType: {
      type: String,
      enum: ["increase", "decrease", "set"],
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [1000, "Remarks cannot exceed 1000 characters"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ type: 1, date: -1 });
transactionSchema.index({ sparePart: 1, date: -1 });
transactionSchema.index({ consumable: 1, date: -1 });
transactionSchema.index({ tool: 1, date: -1 });
transactionSchema.index({ itemType: 1, date: -1 });
transactionSchema.index({ date: -1 });

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
