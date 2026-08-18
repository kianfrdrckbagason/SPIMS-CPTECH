import express from "express";
import { param, query } from "express-validator";
import mongoose from "mongoose";
import {
  getTransactions,
  getTransactionById,
  getSparePartTransactionHistory,
  getMonthlySheet,
} from "../controllers/transactionController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

// Monthly Excel-style inventory sheet — must be before /:id to avoid param clash
router.get(
  "/monthly-sheet",
  [
    query("month").optional().isInt({ min: 1, max: 12 }).toInt(),
    query("year").optional().isInt({ min: 2000, max: 2100 }).toInt(),
    query("itemType").optional().isIn(["sparePart", "consumable"]).trim(),
    query("category").optional().trim(),
  ],
  getMonthlySheet
);

router.get(
  "/",
  [
    query("type").optional().trim(),
    query("itemType").optional().trim(),
    query("startDate").optional().trim(),
    query("endDate").optional().trim(),
    query("fromDate").optional().trim(),
    query("toDate").optional().trim(),
    query("sort").optional().trim(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 500 }),
  ],
  getTransactions
);

router.get(
  "/:id",
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid Transaction ID format"),
  ],
  getTransactionById
);

router.get(
  "/spare-part/:id/history",
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid SparePart ID format"),
  ],
  getSparePartTransactionHistory
);

export default router;
