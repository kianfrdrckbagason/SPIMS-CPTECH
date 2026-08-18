import mongoose from "mongoose";

const sparePartSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Spare part name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [200, "Name cannot exceed 200 characters"],
    },
    partNumber: {
      type: Number,
      default: 0,
      min: [0, "Part number must be zero or positive"],
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [2, "SKU must be at least 2 characters"],
      maxlength: [50, "SKU cannot exceed 50 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    machine: {
      type: String,
      trim: true,
      maxlength: [150, "Machine name cannot exceed 150 characters"],
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
    },
    quantity: {
      type: Number,
      required: [true, "Current quantity is required"],
      default: 0,
      min: [0, "Quantity cannot be negative"],
    },
    minStockLevel: {
      type: Number,
      required: [true, "Minimum stock level is required"],
      default: 5,
      min: [0, "Minimum stock level cannot be negative"],
    },
    maxStockLevel: {
      type: Number,
      min: [0, "Maximum stock level cannot be negative"],
    },
    unitPrice: {
      type: Number,
      default: 0,
      min: [0, "Unit price cannot be negative"],
    },
    reorderLevel: {
      type: Number,
      default: 10,
      min: [0, "Reorder level cannot be negative"],
    },
    status: {
      type: String,
      enum: ["active", "inactive", "discontinued", "archived"],
      default: "active",
    },
    movementClassification: {
      type: String,
      enum: ["fast", "medium", "low"],
      default: "medium",
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: [0, "Sort order cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

// Movement classification thresholds
const MOVEMENT_THRESHOLDS = {
  fast: { good: 10, low: 1, out: 0 },
  medium: { good: 5, low: 1, out: 0 },
  low: { good: 1, low: 0, out: 0 },
};

sparePartSchema.virtual("stockStatus").get(function () {
  // Use the thresholds defined in the controller for consistency
  const MOVEMENT_THRESHOLDS = {
    fast: { good: 10, low: 1, out: 0 },
    medium: { good: 5, low: 1, out: 0 },
    low: { good: 1, low: 0, out: 0 },
  };
  const thresholds = MOVEMENT_THRESHOLDS[this.movementClassification || "medium"] || MOVEMENT_THRESHOLDS.medium;
  
  if (this.quantity <= thresholds.out) return "red";
  if (this.quantity <= thresholds.low) return "orange";
  return "green";
});

sparePartSchema.methods.getStockStatusLabel = function () {
  // Use the thresholds defined in the controller for consistency
  const MOVEMENT_THRESHOLDS = {
    fast: { good: 10, low: 1, out: 0 },
    medium: { good: 5, low: 1, out: 0 },
    low: { good: 1, low: 0, out: 0 },
  };
  const thresholds = MOVEMENT_THRESHOLDS[this.movementClassification || "medium"] || MOVEMENT_THRESHOLDS.medium;
  
  if (this.quantity <= thresholds.out) return "OUT";
  if (this.quantity <= thresholds.low) return "LOW";
  if (this.quantity <= thresholds.good) return "GOOD";
  return "GOOD";
};

sparePartSchema.set("toJSON", { virtuals: true });
sparePartSchema.set("toObject", { virtuals: true });

sparePartSchema.index({ name: "text", sku: "text", description: "text", machine: "text" });
sparePartSchema.index({ category: 1, status: 1 });
sparePartSchema.index({ quantity: 1, minStockLevel: 1 });
sparePartSchema.index({ sortOrder: 1 });

const SparePart = mongoose.model("SparePart", sparePartSchema);

export default SparePart;
