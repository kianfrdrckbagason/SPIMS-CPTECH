import express from "express";
import { body, query } from "express-validator";
import mongoose from "mongoose";
import {
  recordStockIn,
  consumableStockIn,
} from "../controllers/stockInController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.post(
  "/spare-part",
  [
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
    body("receivedBy")
      .optional()
      .trim()
      .isLength({ max: 150 })
      .withMessage("Received by cannot exceed 150 characters"),
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
    body("unitPrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Unit price must be a non-negative number"),
  ],
  recordStockIn
);

router.post(
  "/consumable",
  [
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
    body("receivedBy")
      .optional()
      .trim()
      .isLength({ max: 150 })
      .withMessage("Received by cannot exceed 150 characters"),
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
    body("unitPrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Unit price must be a non-negative number"),
  ],
  consumableStockIn
);

export default router;
