import mongoose from "mongoose";

// ── Recount line item ─────────────────────────────────────────────────────────
const recountItemSchema = new mongoose.Schema(
  {
    sparePart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SparePart",
      required: true,
    },
    systemQty: {
      type: Number,
      required: true,
      min: [0, "System quantity cannot be negative"],
    },
    actualQty: {
      type: Number,
      default: null, // null = not yet counted
      min: [0, "Actual quantity cannot be negative"],
    },
    difference: {
      type: Number,
      default: null, // null until actualQty is recorded
    },
    status: {
      type: String,
      enum: ["pending", "matched", "discrepancy"],
      default: "pending",
    },
    adjustmentCreated: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

// ── Recount session ───────────────────────────────────────────────────────────
const inventoryRecountSchema = new mongoose.Schema(
  {
    recountDate: {
      type: Date,
      required: [true, "Recount date is required"],
      default: Date.now,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
      default: "",
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null, // null = all categories
    },
    status: {
      type: String,
      enum: ["draft", "in_progress", "completed"],
      default: "draft",
    },
    items: [recountItemSchema],
    preparedBy: {
      type: String,
      trim: true,
      maxlength: [150, "Prepared by cannot exceed 150 characters"],
      default: "",
    },
    checkedBy: {
      type: String,
      trim: true,
      maxlength: [150, "Checked by cannot exceed 150 characters"],
      default: "",
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [1000, "Remarks cannot exceed 1000 characters"],
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

inventoryRecountSchema.index({ recountDate: -1 });
inventoryRecountSchema.index({ status: 1, recountDate: -1 });
inventoryRecountSchema.index({ category: 1, recountDate: -1 });

const InventoryRecount = mongoose.model("InventoryRecount", inventoryRecountSchema);

export default InventoryRecount;
