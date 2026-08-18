import mongoose from "mongoose";

const toolInventorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tool name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [200, "Name cannot exceed 200 characters"],
    },
    toolCode: {
      type: String,
      required: [true, "Tool code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [2, "Tool code must be at least 2 characters"],
      maxlength: [50, "Tool code cannot exceed 50 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    category: {
      type: String,
      required: [true, "Tool category is required"],
      trim: true,
      maxlength: [100, "Category cannot exceed 100 characters"],
    },
    brand: {
      type: String,
      trim: true,
      maxlength: [100, "Brand cannot exceed 100 characters"],
    },
    model: {
      type: String,
      trim: true,
      maxlength: [100, "Model cannot exceed 100 characters"],
    },
    serialNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      maxlength: [100, "Serial number cannot exceed 100 characters"],
    },
    totalQuantity: {
      type: Number,
      required: [true, "Total quantity is required"],
      default: 1,
      min: [1, "Total quantity must be at least 1"],
    },
    availableQuantity: {
      type: Number,
      required: [true, "Available quantity is required"],
      default: 1,
      min: [0, "Available quantity cannot be negative"],
    },
    condition: {
      type: String,
      enum: ["new", "good", "fair", "poor", "damaged", "lost"],
      default: "good",
    },
    location: {
      type: String,
      trim: true,
      maxlength: [200, "Location cannot exceed 200 characters"],
    },
    purchaseDate: {
      type: Date,
    },
    purchasePrice: {
      type: Number,
      min: [0, "Purchase price cannot be negative"],
    },
    status: {
      type: String,
      enum: ["available", "borrowed", "maintenance", "lost", "damaged", "retired"],
      default: "available",
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, "Remarks cannot exceed 500 characters"],
    },
    documentation: {
      manual: {
        hasDocument: { type: Boolean, default: false },
        title: { type: String, maxlength: [200, "Title cannot exceed 200 characters"] },
        reference: { type: String, maxlength: [200, "Reference cannot exceed 200 characters"] },
      },
      serviceManual: {
        hasDocument: { type: Boolean, default: false },
        title: { type: String, maxlength: [200, "Title cannot exceed 200 characters"] },
        reference: { type: String, maxlength: [200, "Reference cannot exceed 200 characters"] },
      },
      operatingGuide: {
        hasDocument: { type: Boolean, default: false },
        title: { type: String, maxlength: [200, "Title cannot exceed 200 characters"] },
        reference: { type: String, maxlength: [200, "Reference cannot exceed 200 characters"] },
      },
      otherDocuments: {
        type: [
          {
            type: { type: String, enum: ["pdf", "jpg", "png", "doc", "docx"], required: true },
            title: { type: String, required: true, maxlength: 200 },
            reference: { type: String, maxlength: 200 },
          },
        ],
        default: [],
      },
    },
  },
  {
    timestamps: true,
  }
);

toolInventorySchema.virtual("availabilityStatus").get(function () {
  if (this.status === "lost" || this.status === "retired") return "red";
  if (this.status === "damaged" || this.status === "maintenance") return "orange";
  if (this.availableQuantity <= 0) return "orange";
  return "green";
});

toolInventorySchema.set("toJSON", { virtuals: true });
toolInventorySchema.set("toObject", { virtuals: true });

toolInventorySchema.index({ name: "text", toolCode: "text", description: "text" });
toolInventorySchema.index({ status: 1 });

const ToolInventory = mongoose.model("ToolInventory", toolInventorySchema);

export default ToolInventory;
