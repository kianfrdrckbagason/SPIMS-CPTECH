import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Category name must be at least 2 characters"],
      maxlength: [150, "Category name cannot exceed 150 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    machine: {
      type: String,
      trim: true,
      maxlength: [150, "Machine/Equipment cannot exceed 150 characters"],
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: [0, "Sort order must be zero or positive"],
    },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ name: "text", description: "text", machine: "text" });
categorySchema.index({ status: 1, sortOrder: 1 });

const Category = mongoose.model("Category", categorySchema);

export default Category;
