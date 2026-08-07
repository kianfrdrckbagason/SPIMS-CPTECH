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
  },
  {
    timestamps: true,
  }
);

consumableSchema.virtual("stockStatus").get(function () {
  if (this.quantity <= 0) return "red";
  if (this.quantity <= this.minStockLevel) return "orange";
  return "green";
});

consumableSchema.set("toJSON", { virtuals: true });
consumableSchema.set("toObject", { virtuals: true });

consumableSchema.index({ name: "text", sku: "text", description: "text" });

const Consumable = mongoose.model("Consumable", consumableSchema);

export default Consumable;
