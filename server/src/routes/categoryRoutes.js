import express from "express";
import { body, param, query } from "express-validator";
import mongoose from "mongoose";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  archiveCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.use(protect);

router.get(
  "/",
  [
    query("search").optional().trim(),
    query("status").optional().trim(),
    query("sortBy").optional().trim(),
    query("sortOrder").optional().isIn(["asc", "desc"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 0 }),
  ],
  getCategories
);

router.get(
  "/:id",
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid Category ID format"),
  ],
  getCategoryById
);

router.post(
  "/",
  authorize("admin"),
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Category name is required")
      .isLength({ min: 2, max: 150 })
      .withMessage("Category name must be between 2 and 150 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
    body("machine")
      .optional()
      .trim()
      .isLength({ max: 150 })
      .withMessage("Machine cannot exceed 150 characters"),
    body("sortOrder").optional().isInt({ min: 0 }).withMessage("Sort order must be a zero or positive integer"),
    body("status")
      .optional()
      .isIn(["active", "inactive", "archived"])
      .withMessage("Status must be active, inactive, or archived"),
  ],
  createCategory
);

router.put(
  "/:id",
  authorize("admin"),
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid Category ID format"),
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 150 })
      .withMessage("Category name must be between 2 and 150 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
    body("machine")
      .optional()
      .trim()
      .isLength({ max: 150 })
      .withMessage("Machine cannot exceed 150 characters"),
    body("sortOrder").optional().isInt({ min: 0 }).withMessage("Sort order must be a zero or positive integer"),
    body("status")
      .optional()
      .isIn(["active", "inactive", "archived"])
      .withMessage("Status must be active, inactive, or archived"),
  ],
  updateCategory
);

router.put(
  "/:id/archive",
  authorize("admin"),
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid Category ID format"),
  ],
  archiveCategory
);

router.delete(
  "/:id",
  authorize("admin"),
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid Category ID format"),
  ],
  deleteCategory
);

export default router;
