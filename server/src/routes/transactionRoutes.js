import express from "express";
import { param, query } from "express-validator";
import mongoose from "mongoose";
import {
  getTransactions,
  getTransactionById,
  getSparePartTransactionHistory,
} from "../controllers/transactionController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get(
  "/",
  [
    query("type").optional().trim(),
    query("itemType").optional().trim(),
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
