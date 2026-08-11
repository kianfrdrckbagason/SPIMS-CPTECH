import express from "express";
import { body, param, query } from "express-validator";
import mongoose from "mongoose";
import {
  createRecount,
  getRecounts,
  getRecountById,
  submitCounts,
  completeRecount,
  applyAdjustment,
  deleteRecount,
} from "../controllers/inventoryRecountController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.use(protect);

// List all recounts (all authenticated users)
router.get(
  "/",
  [
    query("status").optional().isIn(["draft", "in_progress", "completed"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1 }),
  ],
  getRecounts
);

// Get single recount
router.get(
  "/:id",
  [param("id").custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage("Invalid ID")],
  getRecountById
);

// Create a new recount session (admin only)
router.post(
  "/",
  authorize("admin"),
  [
    body("recountDate").optional().isISO8601().withMessage("Invalid date"),
    body("title").optional().trim().isLength({ max: 200 }),
    body("category")
      .optional({ nullable: true })
      .custom((v) => !v || mongoose.Types.ObjectId.isValid(v))
      .withMessage("Invalid category ID"),
    body("preparedBy").optional().trim().isLength({ max: 150 }),
    body("checkedBy").optional().trim().isLength({ max: 150 }),
    body("remarks").optional().trim().isLength({ max: 1000 }),
  ],
  createRecount
);

// Submit actual counts
router.put(
  "/:id/counts",
  [
    param("id").custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage("Invalid ID"),
    body("counts").isArray({ min: 1 }).withMessage("counts must be a non-empty array"),
    body("counts.*.itemId").notEmpty().withMessage("itemId is required"),
    body("counts.*.actualQty").isInt({ min: 0 }).withMessage("actualQty must be a non-negative integer"),
  ],
  submitCounts
);

// Complete a recount (admin only)
router.put(
  "/:id/complete",
  authorize("admin"),
  [
    param("id").custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage("Invalid ID"),
    body("checkedBy").optional().trim().isLength({ max: 150 }),
    body("remarks").optional().trim().isLength({ max: 1000 }),
  ],
  completeRecount
);

// Apply inventory adjustment for a discrepant item (admin only)
router.post(
  "/:id/adjust",
  authorize("admin"),
  [
    param("id").custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage("Invalid ID"),
    body("itemId").notEmpty().withMessage("itemId is required"),
  ],
  applyAdjustment
);

// Delete a draft recount (admin only)
router.delete(
  "/:id",
  authorize("admin"),
  [param("id").custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage("Invalid ID")],
  deleteRecount
);

export default router;
