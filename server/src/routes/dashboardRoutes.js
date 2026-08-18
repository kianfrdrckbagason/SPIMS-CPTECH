import express from "express";
import {
  getStats,
  getRecentActivity,
  getMonthlyTransactions,
  getCategoryDistribution,
  getFrequentParts,
  getLowStockItems,
  getOutOfStockItems,
  getStockInHistory,
  getStockOutHistory,
} from "../controllers/dashboardController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.use(protect);

router.get("/stats", getStats);

router.get("/recent-activity", getRecentActivity);

router.get("/charts/monthly-transactions", getMonthlyTransactions);

router.get("/charts/category-distribution", getCategoryDistribution);

router.get("/charts/frequent-parts", getFrequentParts);

router.get("/low-stock-items", getLowStockItems);

router.get("/out-of-stock-items", getOutOfStockItems);

router.get("/stock-in-history", getStockInHistory);

router.get("/stock-out-history", getStockOutHistory);

router.get("/admin-summary", authorize("admin"), async (req, res) => {
  try {
    const inactiveUsers = await (await import("../models/User.js")).default.countDocuments({
      status: "inactive",
    });
    const discontinuedParts = await (await import("../models/SparePart.js")).default.countDocuments({
      status: "discontinued",
    });
    const inactiveSuppliers = await (await import("../models/Supplier.js")).default.countDocuments({
      status: "inactive",
    });

    res.status(200).json({
      success: true,
      data: {
        inactiveUsers,
        discontinuedParts,
        inactiveSuppliers,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while fetching admin summary",
    });
  }
});

export default router;
