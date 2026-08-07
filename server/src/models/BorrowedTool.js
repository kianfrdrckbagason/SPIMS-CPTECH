import mongoose from "mongoose";

const borrowedToolSchema = new mongoose.Schema(
  {
    tool: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ToolInventory",
      required: [true, "Tool is required"],
    },
    borrowerName: {
      type: String,
      required: [true, "Borrower name is required"],
      trim: true,
      minlength: [2, "Borrower name must be at least 2 characters"],
      maxlength: [150, "Borrower name cannot exceed 150 characters"],
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
      maxlength: [100, "Department cannot exceed 100 characters"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      default: 1,
      min: [1, "Quantity must be at least 1"],
    },
    borrowDate: {
      type: Date,
      required: [true, "Borrow date is required"],
      default: Date.now,
    },
    expectedReturnDate: {
      type: Date,
      required: [true, "Expected return date is required"],
    },
    actualReturnDate: {
      type: Date,
    },
    toolConditionOnBorrow: {
      type: String,
      enum: ["new", "good", "fair", "poor"],
      default: "good",
      required: [true, "Condition on borrow is required"],
    },
    toolConditionOnReturn: {
      type: String,
      enum: ["new", "good", "fair", "poor", "damaged", "lost"],
    },
    status: {
      type: String,
      enum: ["borrowed", "returned", "lost", "damaged", "overdue"],
      default: "borrowed",
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Issued by user is required"],
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, "Remarks cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
  }
);

borrowedToolSchema.virtual("isOverdue").get(function () {
  if (this.status === "returned" || this.status === "lost" || this.status === "damaged") return false;
  const now = new Date();
  const expected = new Date(this.expectedReturnDate);
  expected.setHours(23, 59, 59, 999);
  return now > expected;
});

borrowedToolSchema.virtual("overdueDays").get(function () {
  if (!this.isOverdue) return 0;
  const now = new Date();
  const expected = new Date(this.expectedReturnDate);
  expected.setHours(23, 59, 59, 999);
  const diffMs = now - expected;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
});

borrowedToolSchema.set("toJSON", { virtuals: true });
borrowedToolSchema.set("toObject", { virtuals: true });

borrowedToolSchema.index({ status: 1, borrowDate: -1 });
borrowedToolSchema.index({ tool: 1, status: 1 });
borrowedToolSchema.index({ expectedReturnDate: 1, status: 1 });
borrowedToolSchema.index({ borrowerName: 1 });

const BorrowedTool = mongoose.model("BorrowedTool", borrowedToolSchema);

export default BorrowedTool;
