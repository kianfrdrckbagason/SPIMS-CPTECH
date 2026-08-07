import express from "express";
import { body, param, query } from "express-validator";
import mongoose from "mongoose";
import {
  createConsumable,
  getConsumables,
  getConsumableById,
  updateConsumable,
  deleteConsumable,
} from "../controllers/consumableController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.use(protect);

router.get(
  "/",
  [
    query("search").optional().trim(),
    query("unit").optional().trim(),
    query("status").optional().trim(),
    query("sortBy").optional().trim(),
    query("sortOrder").optional().isIn(["asc", "desc"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 0 }),
  ],
  getConsumables
);

router.get(
  "/:id",
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid Consumable ID format"),
  ],
  getConsumableById
);

router.post(
  "/",
  authorize("admin"),
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Consumable name is required")
      .isLength({ min: 2, max: 200 })
      .withMessage("Name must be between 2 and 200 characters"),
    body("sku")
      .trim()
      .notEmpty()
      .withMessage("SKU is required")
      .isLength({ min: 2, max: 50 })
      .withMessage("SKU must be between 2 and 50 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Description cannot exceed 1000 characters"),
    body("unit")
      .trim()
      .notEmpty()
      .withMessage("Unit of measure is required (e.g., box, pair, piece)")
      .isLength({ max: 30 })
      .withMessage("Unit cannot exceed 30 characters"),
    body("quantity")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Quantity must be a non-negative integer"),
    body("status")
      .optional()
      .isIn(["active", "inactive", "discontinued"])
      .withMessage("Status must be active, inactive, or discontinued"),
  ],
  createConsumable
);

router.put(
  "/:id",
  authorize("admin"),
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid Consumable ID format"),
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage("Name must be between 2 and 200 characters"),
    body("sku")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("SKU must be between 2 and 50 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Description cannot exceed 1000 characters"),
    body("unit")
      .optional()
      .trim()
      .isLength({ max: 30 })
      .withMessage("Unit cannot exceed 30 characters"),
    body("quantity")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Quantity must be a non-negative integer"),
    body("status")
      .optional()
      .isIn(["active", "inactive", "discontinued"])
      .withMessage("Status must be active, inactive, or discontinued"),
  ],
  updateConsumable
);

router.delete(
  "/:id",
  authorize("admin"),
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid Consumable ID format"),
  ],
  deleteConsumable
);

export default router;
