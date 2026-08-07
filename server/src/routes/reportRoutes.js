import express from "express";
import {
  generateTransactionsReport,
  generateStockStatusReport,
  generateBorrowedToolsReport,
  generateConsumablesReport,
  getInventorySummaryReportData,
} from "../controllers/reportController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.use(protect);

router.get("/transactions", generateTransactionsReport);
router.get("/stock-status", generateStockStatusReport);
router.get("/borrowed-tools", generateBorrowedToolsReport);
router.get("/consumables", generateConsumablesReport);
router.get("/inventory-summary", getInventorySummaryReportData);

export default router;
