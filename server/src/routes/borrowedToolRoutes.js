import express from "express";
import { body, param } from "express-validator";
import {
  borrowTool,
  returnTool,
  markOverdue,
  getBorrowedTools,
  getBorrowedToolById,
  deleteBorrowedTool,
} from "../controllers/borrowedToolController.js";
import { protect } from "../middleware/auth.js";
import mongoose from "mongoose";

const router = express.Router();

router.use(protect);

router.post(
  "/borrow",
  [
    body("tool")
      .notEmpty()
      .withMessage("Tool ID is required")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid Tool ID format"),
    body("borrowerName")
      .trim()
      .notEmpty()
      .withMessage("Borrower name is required")
      .isLength({ min: 2, max: 150 })
      .withMessage("Borrower name must be between 2 and 150 characters"),
    body("department")
      .trim()
      .notEmpty()
      .withMessage("Department is required")
      .isLength({ max: 100 })
      .withMessage("Department cannot exceed 100 characters"),
    body("quantity")
      .notEmpty()
      .withMessage("Quantity is required")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    body("expectedReturnDate")
      .notEmpty()
      .withMessage("Expected return date is required")
      .isISO8601()
      .withMessage("Expected return date must be a valid date"),
    body("borrowDate")
      .optional()
      .isISO8601()
      .withMessage("Borrow date must be a valid date"),
    body("toolConditionOnBorrow")
      .optional()
      .isIn(["new", "good", "fair", "poor"])
      .withMessage("Condition on borrow must be new, good, fair, or poor"),
    body("remarks")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Remarks cannot exceed 500 characters"),
  ],
  borrowTool
);

router.put(
  "/return/:id",
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid BorrowedTool ID format"),
    body("actualReturnDate")
      .optional()
      .isISO8601()
      .withMessage("Actual return date must be a valid date"),
    body("toolConditionOnReturn")
      .notEmpty()
      .withMessage("Tool condition on return is required")
      .isIn(["new", "good", "fair", "poor", "damaged", "lost"])
      .withMessage("Condition on return must be new, good, fair, poor, damaged, or lost"),
    body("receivedBy")
      .optional()
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid receivedBy user ID format"),
    body("remarks")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Remarks cannot exceed 500 characters"),
  ],
  returnTool
);

router.post("/mark-overdue", markOverdue);

router.get("/", getBorrowedTools);

router.get(
  "/:id",
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid BorrowedTool ID format"),
  ],
  getBorrowedToolById
);

router.delete(
  "/:id",
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid BorrowedTool ID format"),
  ],
  deleteBorrowedTool
);

export default router;
