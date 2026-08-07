import express from "express";
import { body, param, query } from "express-validator";
import mongoose from "mongoose";
import {
  createSparePart,
  getSpareParts,
  getSparePartById,
  updateSparePart,
  deleteSparePart,
} from "../controllers/sparePartController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.use(protect);

router.get(
  "/",
  [
    query("search").optional().trim(),
    query("category").optional(),
    query("machine").optional().trim(),
    query("status").optional().trim(),
    query("sortBy").optional().trim(),
    query("sortOrder").optional().isIn(["asc", "desc"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 0 }),
  ],
  getSpareParts
);

router.get(
  "/:id",
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid SparePart ID format"),
  ],
  getSparePartById
);

router.post(
  "/",
  authorize("admin"),
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Spare part name is required")
      .isLength({ min: 2, max: 200 })
      .withMessage("Name must be between 2 and 200 characters"),
    body("partNumber")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Part number must be a zero or positive integer"),
    body("sku")
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("SKU must be between 2 and 50 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Description cannot exceed 1000 characters"),
    body("category")
      .notEmpty()
      .withMessage("Category is required")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid Category ID format"),
    body("machine")
      .optional()
      .trim()
      .isLength({ max: 150 })
      .withMessage("Machine cannot exceed 150 characters"),
    body("supplier")
      .optional()
      .custom((val) => {
        if (!val) return true;
        return mongoose.Types.ObjectId.isValid(val);
      })
      .withMessage("Invalid Supplier ID format"),
    body("quantity")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Quantity must be a non-negative integer"),
    body("minStockLevel")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Minimum stock level must be a non-negative integer"),
    body("maxStockLevel")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Maximum stock level must be a non-negative integer"),
    body("unitPrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Unit price must be a non-negative number"),
    body("reorderLevel")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Reorder level must be a non-negative integer"),
    body("status")
      .optional()
      .isIn(["active", "inactive", "discontinued", "archived"])
      .withMessage("Status must be active, inactive, discontinued, or archived"),
  ],
  createSparePart
);

router.put(
  "/:id",
  authorize("admin"),
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid SparePart ID format"),
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage("Name must be between 2 and 200 characters"),
    body("partNumber")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Part number must be a zero or positive integer"),
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
    body("category")
      .optional()
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid Category ID format"),
    body("machine")
      .optional()
      .trim()
      .isLength({ max: 150 })
      .withMessage("Machine cannot exceed 150 characters"),
    body("supplier")
      .optional()
      .custom((val) => {
        if (!val) return true;
        return mongoose.Types.ObjectId.isValid(val);
      })
      .withMessage("Invalid Supplier ID format"),
    body("quantity")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Quantity must be a non-negative integer"),
    body("minStockLevel")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Minimum stock level must be a non-negative integer"),
    body("maxStockLevel")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Maximum stock level must be a non-negative integer"),
    body("unitPrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Unit price must be a non-negative number"),
    body("reorderLevel")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Reorder level must be a non-negative integer"),
    body("status")
      .optional()
      .isIn(["active", "inactive", "discontinued", "archived"])
      .withMessage("Status must be active, inactive, discontinued, or archived"),
  ],
  updateSparePart
);

router.delete(
  "/:id",
  authorize("admin"),
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid SparePart ID format"),
  ],
  deleteSparePart
);

export default router;
