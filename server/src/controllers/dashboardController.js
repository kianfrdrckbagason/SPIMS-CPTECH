import SparePart from "../models/SparePart.js";
import Consumable from "../models/Consumable.js";
import Category from "../models/Category.js";
import ToolInventory from "../models/ToolInventory.js";
import BorrowedTool from "../models/BorrowedTool.js";
import DailyConsumption from "../models/DailyConsumption.js";
import Transaction from "../models/Transaction.js";
import Notification from "../models/Notification.js";

const startOfDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

const startOfDaysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfYear = () => {
  const d = new Date();
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getDashboardStats = async (req, res) => {
  try {
    const todayStart = startOfDay();
    const todayEnd = endOfDay();
    const thirtyDaysAgo = startOfDaysAgo(29);
    const yearStart = startOfYear();

    const [
      totalSpareParts,
      totalActiveCategories,
      totalConsumables,
      totalTools,
      totalBorrowedTools,
      itemsBorrowedToday,
      greenStocks,
      warningStocks,
      outOfStock,
      todayStockIn,
      todayStockOut,
      todayConsumableUsage,
    ] = await Promise.all([
      SparePart.countDocuments({ status: "active" }),
      Category.countDocuments({ status: "active" }),
      Consumable.countDocuments({ status: "active" }),
      ToolInventory.countDocuments({ status: { $in: ["available", "borrowed", "maintenance"] } }),
      BorrowedTool.countDocuments({ status: { $in: ["borrowed", "overdue"] } }),
      BorrowedTool.countDocuments({
        borrowDate: { $gte: todayStart, $lte: todayEnd },
      }),
      SparePart.countDocuments({
        quantity: { $gt: 0 },
        $expr: { $gt: ["$quantity", "$minStockLevel"] },
        status: "active",
      }),
      SparePart.countDocuments({
        quantity: { $gt: 0 },
        $expr: { $lte: ["$quantity", "$minStockLevel"] },
        status: "active",
      }),
      SparePart.countDocuments({ quantity: 0, status: "active" }),
      Transaction.aggregate([
        { $match: { date: { $gte: todayStart, $lte: todayEnd }, type: { $in: ["stockIn", "consumableStockIn"] } } },
        { $group: { _id: null, count: { $sum: 1 }, totalQuantity: { $sum: "$quantity" }, totalValue: { $sum: { $multiply: ["$quantity", "$unitPrice"] } } } },
      ]),
      Transaction.aggregate([
        { $match: { date: { $gte: todayStart, $lte: todayEnd }, type: "stockOut" } },
        { $group: { _id: null, count: { $sum: 1 }, totalQuantity: { $sum: "$quantity" }, totalValue: { $sum: { $multiply: ["$quantity", "$unitPrice"] } } } },
      ]),
      Transaction.aggregate([
        { $match: { date: { $gte: todayStart, $lte: todayEnd }, type: "consumableRelease" } },
        { $group: { _id: null, count: { $sum: 1 }, totalQuantity: { $sum: "$quantity" }, totalValue: { $sum: { $multiply: ["$quantity", "$unitPrice"] } } } },
      ]),
    ]);

    const todayStockInData = todayStockIn[0] || { count: 0, totalQuantity: 0, totalValue: 0 };
    const todayStockOutData = todayStockOut[0] || { count: 0, totalQuantity: 0, totalValue: 0 };
    const todayConsumableUsageData = todayConsumableUsage[0] || { count: 0, totalQuantity: 0, totalValue: 0 };

    const totalSuppliers = 0;
    const totalUsers = 0;
    const stockInTransactions = todayStockInData.count;
    const stockOutTransactions = todayStockOutData.count;
    const stockInQuantity = todayStockInData.totalQuantity;
    const stockInValue = todayStockInData.totalValue;
    const stockOutQuantity = todayStockOutData.totalQuantity;
    const stockOutValue = todayStockOutData.totalValue;

    res.status(200).json({
      success: true,
      data: {
        totalSpareParts,
        totalCategories: totalActiveCategories,
        totalActiveCategories,
        totalConsumables,
        totalTools,
        totalBorrowedTools,
        itemsBorrowedToday,
        greenStocks,
        warningStocks,
        outOfStock,
        lowStockItems: warningStocks,
        outOfStockItems: outOfStock,
        totalSuppliers,
        totalUsers,
        stockInTransactions,
        stockOutTransactions,
        stockInQuantity,
        stockInValue,
        stockOutQuantity,
        stockOutValue,
        todayStockIn: todayStockInData,
        todayStockOut: todayStockOutData,
        todayConsumableUsage: todayConsumableUsageData,
      },
    });
  } catch (error) {
    console.error("getDashboardStats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching dashboard stats",
    });
  }
};

export const getStats = getDashboardStats;

export const getRecentActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    // fetch recent transactions
    const transactions = await Transaction.find()
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .populate("sparePart", "name sku")
      .populate("consumable", "name sku")
      .populate("tool", "name toolCode")
      .populate("user", "fullName email");

    // fetch recent notifications
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("user", "fullName email");

    // fetch recent spare part creations/updates
    const spareParts = await SparePart.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("category", "name")
      .populate("supplier", "name");

    const txMap = transactions.map((tx) => {
      const item = tx.sparePart?.name || tx.consumable?.name || tx.tool?.name || "";
      const typeLabelMap = {
        stockIn: "Stock In",
        stockOut: "Stock Out",
        adjustment: "Adjustment",
        borrowTool: "Borrow Tool",
        returnTool: "Return Tool",
        consumableRelease: "Consumable Release",
        consumableStockIn: "Consumable Stock In",
        consumableAdjustment: "Consumable Adjustment",
      };
      return {
        id: tx._id,
        _id: tx._id,
        kind: "transaction",
        type: tx.type,
        typeLabel: typeLabelMap[tx.type] || tx.type,
        item,
        name: item,
        user: tx.user?.fullName || "",
        quantity: tx.quantity,
        reference: tx.reference || "",
        createdAt: tx.date || tx.createdAt,
        sku: tx.sparePart?.sku || tx.consumable?.sku || tx.tool?.toolCode || "",
      };
    });

    const notifMap = notifications.map((n) => ({
      id: n._id,
      _id: n._id,
      kind: "notification",
      type: n.type,
      typeLabel: n.title,
      item: n.reference?.modelType || "",
      name: n.title,
      user: n.user?.fullName || "",
      message: n.message,
      createdAt: n.createdAt,
    }));

    const spMap = spareParts.map((s) => {
      const isCreated = s.createdAt && s.updatedAt && s.createdAt.getTime() === s.updatedAt.getTime();
      return {
        id: s._id,
        _id: s._id,
        kind: "sparePart",
        type: isCreated ? "created" : "updated",
        typeLabel: isCreated ? "Spare Part Created" : "Spare Part Updated",
        item: s.name,
        name: s.name,
        user: "",
        sku: s.sku || "",
        createdAt: s.createdAt,
      };
    });

    console.log('getRecentActivity counts -> transactions:', transactions.length, 'notifications:', notifications.length, 'spareParts:', spareParts.length);

    // combine and sort by createdAt desc, then limit
    const combined = [...txMap, ...notifMap, ...spMap]
      .filter((x) => x && x.createdAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    res.status(200).json({
      success: true,
      data: combined,
    });
  } catch (error) {
    console.error("getRecentActivity error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching recent activity",
    });
  }
};

export const getMonthlyTransactions = async (req, res) => {
  try {
    const twelveMonthsAgo = startOfDaysAgo(364);
    const todayEnd = endOfDay();

    const raw = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: twelveMonthsAgo, $lte: todayEnd },
          type: { $in: ["stockIn", "stockOut", "adjustment", "consumableStockIn", "consumableRelease"] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            type: "$type",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const now = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const labels = [];
    const stockInArr = [];
    const stockOutArr = [];
    const adjustmentsArr = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      labels.push(monthNames[d.getMonth()] + " " + d.getFullYear().toString().slice(2));

      let si = 0;
      let so = 0;
      let adj = 0;
      for (const row of raw) {
        if (row._id.year === y && row._id.month === m) {
          if (row._id.type === "stockIn" || row._id.type === "consumableStockIn") si += row.count;
          else if (row._id.type === "stockOut" || row._id.type === "consumableRelease") so += row.count;
          else if (row._id.type === "adjustment" || row._id.type === "consumableAdjustment") adj += row.count;
        }
      }
      stockInArr.push(si);
      stockOutArr.push(so);
      adjustmentsArr.push(adj);
    }

    res.status(200).json({
      success: true,
      data: {
        labels,
        stockIn: stockInArr,
        stockOut: stockOutArr,
        adjustments: adjustmentsArr,
      },
    });
  } catch (error) {
    console.error("getMonthlyTransactions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching monthly transactions",
    });
  }
};

export const getCategoryDistribution = async (req, res) => {
  try {
    const result = await Category.aggregate([
      { $match: { status: "active" } },
      {
        $lookup: {
          from: "spareparts",
          let: { catId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$category", "$$catId"] }, status: "active" } },
            { $group: { _id: null, qty: { $sum: "$quantity" }, count: { $sum: 1 } } },
          ],
          as: "parts",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          machine: 1,
          totalQuantity: { $ifNull: [{ $arrayElemAt: ["$parts.qty", 0] }, 0] },
          sparePartCount: { $ifNull: [{ $arrayElemAt: ["$parts.count", 0] }, 0] },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 12 },
    ]);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("getCategoryDistribution error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching category distribution",
    });
  }
};

export const getFrequentParts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const ninetyDaysAgo = startOfDaysAgo(89);
    const todayEnd = endOfDay();

    const raw = await Transaction.aggregate([
      {
        $match: {
          type: { $in: ["stockOut", "consumableRelease"] },
          date: { $gte: ninetyDaysAgo, $lte: todayEnd },
        },
      },
      {
        $group: {
          _id: {
            partId: { $ifNull: ["$sparePart", "$consumable"] },
            itemType: "$itemType",
          },
          totalQuantity: { $sum: "$quantity" },
          timesUsed: { $sum: 1 },
          totalValue: { $sum: { $multiply: ["$quantity", "$unitPrice"] } },
        },
      },
      { $sort: { timesUsed: -1, totalQuantity: -1 } },
      { $limit: limit },
    ]);

    const result = [];
    for (const row of raw) {
      let name = "Unknown";
      let sku = "N/A";
      const id = row._id.partId;
      if (!id) continue;
      if (row._id.itemType === "consumable") {
        const c = await Consumable.findById(id).select("name sku");
        if (c) { name = c.name; sku = c.sku; }
      } else {
        const p = await SparePart.findById(id).select("name sku");
        if (p) { name = p.name; sku = p.sku; }
      }
      result.push({
        id,
        _id: id,
        name,
        sku,
        timesUsed: row.timesUsed,
        totalQuantity: row.totalQuantity,
        totalValue: row.totalValue,
        itemType: row._id.itemType,
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("getFrequentParts error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching frequent parts",
    });
  }
};
