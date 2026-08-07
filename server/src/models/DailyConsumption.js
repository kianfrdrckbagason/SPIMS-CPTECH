import mongoose from "mongoose";

const dailyConsumptionSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, "Consumption date is required"],
      default: Date.now,
    },
    productionLine: {
      type: String,
      required: [true, "Production line is required"],
      trim: true,
      maxlength: [100, "Production line cannot exceed 100 characters"],
    },
    shift: {
      type: String,
      enum: ["morning", "afternoon", "night", "general"],
      required: [true, "Shift is required"],
      default: "morning",
    },
    consumable: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consumable",
      required: [true, "Consumable is required"],
    },
    quantityUsed: {
      type: Number,
      required: [true, "Quantity used is required"],
      min: [1, "Quantity used must be at least 1"],
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Issued by user is required"],
    },
    receivedBy: {
      type: String,
      trim: true,
      maxlength: [150, "Received by cannot exceed 150 characters"],
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

dailyConsumptionSchema.index({ date: -1, productionLine: 1, shift: 1 });
dailyConsumptionSchema.index({ consumable: 1, date: -1 });
dailyConsumptionSchema.index({ date: -1 });

const DailyConsumption = mongoose.model("DailyConsumption", dailyConsumptionSchema);

export default DailyConsumption;
