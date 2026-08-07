import express from "express";
import { body } from "express-validator";
import mongoose from "mongoose";
import {
  recordStockOut,
  consumableRelease,
} from "../controllers/stockOutController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.post(
  "/spare-part",
  [
    body("employeeName")
      .optional()
      .trim()
      .isLength({ max: 150 })
      .withMessage("Employee name cannot exceed 150 characters"),
    body("department")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Department cannot exceed 100 characters"),
    body("machine")
      .optional()
      .trim()
      .isLength({ max: 150 })
      .withMessage("Machine cannot exceed 150 characters"),
    body("sparePart")
      .notEmpty()
      .withMessage("SparePart ID is required")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid SparePart ID format"),
    body("quantity")
      .notEmpty()
      .withMessage("Quantity is required")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    body("releasedBy")
      .optional()
      .trim()
      .isLength({ max: 150 })
      .withMessage("Released by cannot exceed 150 characters"),
    body("date").optional().isISO8601().withMessage("Date must be a valid date"),
    body("remarks")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Remarks cannot exceed 1000 characters"),
    body("reference")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Reference cannot exceed 100 characters"),
  ],
  recordStockOut
);

router.post(
  "/consumable",
  [
    body("employeeName")
      .optional()
      .trim()
      .isLength({ max: 150 })
      .withMessage("Employee name cannot exceed 150 characters"),
    body("department")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Department cannot exceed 100 characters"),
    body("machine")
      .optional()
      .trim()
      .isLength({ max: 150 })
      .withMessage("Machine cannot exceed 150 characters"),
    body("consumable")
      .notEmpty()
      .withMessage("Consumable ID is required")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid Consumable ID format"),
    body("quantity")
      .notEmpty()
      .withMessage("Quantity is required")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    body("releasedBy")
      .optional()
      .trim()
      .isLength({ max: 150 })
      .withMessage("Released by cannot exceed 150 characters"),
    body("date").optional().isISO8601().withMessage("Date must be a valid date"),
    body("remarks")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Remarks cannot exceed 1000 characters"),
    body("reference")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Reference cannot exceed 100 characters"),
  ],
  consumableRelease
);

export default router;
