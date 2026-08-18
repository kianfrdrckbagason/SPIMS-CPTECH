import mongoose from "mongoose";

const consumableSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Consumable name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [200, "Name cannot exceed 200 characters"],
    },
    unit: {
      type: String,
      required: [true, "Unit of measure is required (e.g., box, pair, piece)"],
      trim: true,
      maxlength: [30, "Unit cannot exceed 30 characters"],
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
      default: 10,
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
    status: {
      type: String,
      enum: ["active", "inactive", "discontinued"],
      default: "active",
    },
    movementClassification: {
      type: String,
      enum: ["fast", "medium", "low"],
      default: "medium",
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

consumableSchema.virtual("stockStatus").get(function () {
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

consumableSchema.methods.getStockStatusLabel = function () {
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

consumableSchema.set("toJSON", { virtuals: true });
consumableSchema.set("toObject", { virtuals: true });

consumableSchema.index({ name: "text" });

const Consumable = mongoose.model("Consumable", consumableSchema);

export default Consumable;
