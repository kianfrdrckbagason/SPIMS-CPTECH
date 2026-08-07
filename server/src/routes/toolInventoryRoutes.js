import express from "express";
import { body, param, query } from "express-validator";
import mongoose from "mongoose";
import {
  createTool,
  getTools,
  getToolById,
  updateTool,
  deleteTool,
} from "../controllers/toolInventoryController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.use(protect);

router.get(
  "/",
  [
    query("search").optional().trim(),
    query("category").optional().trim(),
    query("status").optional().trim(),
    query("condition").optional().trim(),
    query("sortBy").optional().trim(),
    query("sortOrder").optional().isIn(["asc", "desc"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 0 }),
  ],
  getTools
);

router.get(
  "/:id",
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid ToolInventory ID format"),
  ],
  getToolById
);

router.post(
  "/",
  authorize("admin"),
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Tool name is required")
      .isLength({ min: 2, max: 200 })
      .withMessage("Name must be between 2 and 200 characters"),
    body("toolCode")
      .trim()
      .notEmpty()
      .withMessage("Tool code is required")
      .isLength({ min: 2, max: 50 })
      .withMessage("Tool code must be between 2 and 50 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Description cannot exceed 1000 characters"),
    body("category")
      .trim()
      .notEmpty()
      .withMessage("Tool category is required")
      .isLength({ max: 100 })
      .withMessage("Category cannot exceed 100 characters"),
    body("brand")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Brand cannot exceed 100 characters"),
    body("model")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Model cannot exceed 100 characters"),
    body("serialNumber")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Serial number cannot exceed 100 characters"),
    body("totalQuantity")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Total quantity must be at least 1"),
    body("availableQuantity")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Available quantity must be a non-negative integer"),
    body("condition")
      .optional()
      .isIn(["new", "good", "fair", "poor", "damaged", "lost"])
      .withMessage("Condition must be new, good, fair, poor, damaged, or lost"),
    body("location")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Location cannot exceed 200 characters"),
    body("purchaseDate").optional().isISO8601().withMessage("Purchase date must be a valid date"),
    body("purchasePrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Purchase price must be a non-negative number"),
    body("status")
      .optional()
      .isIn(["available", "borrowed", "maintenance", "lost", "damaged", "retired"])
      .withMessage(
        "Status must be available, borrowed, maintenance, lost, damaged, or retired"
      ),
    body("remarks")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Remarks cannot exceed 500 characters"),
  ],
  createTool
);

router.put(
  "/:id",
  authorize("admin"),
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid ToolInventory ID format"),
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage("Name must be between 2 and 200 characters"),
    body("toolCode")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Tool code must be between 2 and 50 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Description cannot exceed 1000 characters"),
    body("category")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Category cannot exceed 100 characters"),
    body("brand")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Brand cannot exceed 100 characters"),
    body("model")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Model cannot exceed 100 characters"),
    body("serialNumber")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Serial number cannot exceed 100 characters"),
    body("totalQuantity")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Total quantity must be at least 1"),
    body("availableQuantity")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Available quantity must be a non-negative integer"),
    body("condition")
      .optional()
      .isIn(["new", "good", "fair", "poor", "damaged", "lost"])
      .withMessage("Condition must be new, good, fair, poor, damaged, or lost"),
    body("location")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Location cannot exceed 200 characters"),
    body("purchaseDate").optional().isISO8601().withMessage("Purchase date must be a valid date"),
    body("purchasePrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Purchase price must be a non-negative number"),
    body("status")
      .optional()
      .isIn(["available", "borrowed", "maintenance", "lost", "damaged", "retired"])
      .withMessage(
        "Status must be available, borrowed, maintenance, lost, damaged, or retired"
      ),
    body("remarks")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Remarks cannot exceed 500 characters"),
  ],
  updateTool
);

router.delete(
  "/:id",
  authorize("admin"),
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid ToolInventory ID format"),
  ],
  deleteTool
);

export default router;
