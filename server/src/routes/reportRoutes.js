import express from "express";
import {
  generateTransactionsReport,
  generateStockStatusReport,
  generateBorrowedToolsReport,
  generateConsumablesReport,
  generateMonthlyInventoryReport,
  getMonthlyTransactionsReport,
  getInventorySummaryReportData,
} from "../controllers/reportController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.use(protect);

router.get("/transactions", authorize("admin"), generateTransactionsReport);
router.get("/stock-status", authorize("admin"), generateStockStatusReport);
router.get("/borrowed-tools", authorize("admin"), generateBorrowedToolsReport);
router.get("/consumables", authorize("admin"), generateConsumablesReport);
router.get("/monthly-inventory", authorize("admin"), generateMonthlyInventoryReport);
router.get("/monthly-transactions", authorize("admin"), getMonthlyTransactionsReport);
router.get("/inventory-summary", authorize("admin"), getInventorySummaryReportData);

export default router;
