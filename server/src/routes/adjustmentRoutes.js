import express from "express";
import { body } from "express-validator";
import mongoose from "mongoose";
import {
  adjustSparePart,
  adjustConsumable,
} from "../controllers/adjustmentController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

router.post(
  "/spare-part",
  [
    body("sparePart")
      .notEmpty()
      .withMessage("SparePart ID is required")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid SparePart ID format"),
    body("adjustmentType")
      .notEmpty()
      .withMessage("Adjustment type is required")
      .isIn(["increase", "decrease", "set"])
      .withMessage("Adjustment type must be increase, decrease, or set"),
    body("quantity")
      .notEmpty()
      .withMessage("Quantity is required")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    body("adjustmentReason")
      .trim()
      .notEmpty()
      .withMessage("Adjustment reason is required")
      .isLength({ max: 500 })
      .withMessage("Adjustment reason cannot exceed 500 characters"),
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
  adjustSparePart
);

router.post(
  "/consumable",
  [
    body("consumable")
      .notEmpty()
      .withMessage("Consumable ID is required")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid Consumable ID format"),
    body("adjustmentType")
      .notEmpty()
      .withMessage("Adjustment type is required")
      .isIn(["increase", "decrease", "set"])
      .withMessage("Adjustment type must be increase, decrease, or set"),
    body("quantity")
      .notEmpty()
      .withMessage("Quantity is required")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    body("adjustmentReason")
      .trim()
      .notEmpty()
      .withMessage("Adjustment reason is required")
      .isLength({ max: 500 })
      .withMessage("Adjustment reason cannot exceed 500 characters"),
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
  adjustConsumable
);

export default router;
