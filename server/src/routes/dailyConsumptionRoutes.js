import express from "express";
import { body, param } from "express-validator";
import {
  createDailyConsumption,
  getDailyConsumptions,
  getMonthlySummary,
} from "../controllers/dailyConsumptionController.js";
import { protect } from "../middleware/auth.js";
import mongoose from "mongoose";

const router = express.Router();

router.use(protect);

router.post(
  "/",
  [
    body("date")
      .optional()
      .isISO8601()
      .withMessage("Date must be a valid date"),
    body("productionLine")
      .trim()
      .notEmpty()
      .withMessage("Production line is required")
      .isLength({ max: 100 })
      .withMessage("Production line cannot exceed 100 characters"),
    body("shift")
      .optional()
      .isIn(["morning", "afternoon", "night", "general"])
      .withMessage("Shift must be morning, afternoon, night, or general"),
    body("consumable")
      .notEmpty()
      .withMessage("Consumable ID is required")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid Consumable ID format"),
    body("quantityUsed")
      .notEmpty()
      .withMessage("Quantity used is required")
      .isInt({ min: 1 })
      .withMessage("Quantity used must be at least 1"),
    body("receivedBy")
      .optional()
      .trim()
      .isLength({ max: 150 })
      .withMessage("Received by cannot exceed 150 characters"),
    body("remarks")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Remarks cannot exceed 500 characters"),
  ],
  createDailyConsumption
);

router.get("/", getDailyConsumptions);

router.get("/summary/monthly", getMonthlySummary);

export default router;
