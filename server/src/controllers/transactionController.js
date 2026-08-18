import Transaction from "../models/Transaction.js";
import SparePart from "../models/SparePart.js";
import Consumable from "../models/Consumable.js";
import ToolInventory from "../models/ToolInventory.js";
import Category from "../models/Category.js";
import mongoose from "mongoose";

const formatItemInfo = (tx) => {
  const txObj = tx.toObject ? tx.toObject() : tx;
  let itemName = null;
  let itemSku = null;

  if (txObj.itemType === "sparePart" && txObj.sparePart) {
    if (typeof txObj.sparePart === "object") {
      itemName = txObj.sparePart.name;
      itemSku = txObj.sparePart.sku;
    }
  } else if (txObj.itemType === "consumable" && txObj.consumable) {
    if (typeof txObj.consumable === "object") {
      itemName = txObj.consumable.name;
      itemSku = txObj.consumable.sku;
    }
  } else if (txObj.itemType === "tool" && txObj.tool) {
    if (typeof txObj.tool === "object") {
      itemName = txObj.tool.name;
      itemSku = txObj.tool.toolCode;
    }
  }

  return { ...txObj, itemName, itemSku };
};

export const getTransactions = async (req, res) => {
  try {
    const {
      type,
      itemType,
      fromDate,
      toDate,
      startDate,      // alias sent by the client
      endDate,        // alias sent by the client
      date,
      sparePart,
      consumable,
      tool,
      search,
      user,
      page = 1,
      limit = 20,
      sort = "-createdAt,-date",
    } = req.query;

    const filter = {};

    if (type) {
      const types = type.split(",");
      filter.type = { $in: types };
    }

    if (itemType) {
      const itemTypes = itemType.split(",");
      filter.itemType = { $in: itemTypes };
    }

    // Accept both fromDate/toDate (legacy) and startDate/endDate (client)
    const resolvedFrom = fromDate || startDate;
    const resolvedTo   = toDate   || endDate;

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    } else if (resolvedFrom || resolvedTo) {
      filter.date = {};
      if (resolvedFrom) filter.date.$gte = new Date(resolvedFrom);
      if (resolvedTo) {
        const end = new Date(resolvedTo);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    if (sparePart) filter.sparePart = new mongoose.Types.ObjectId(sparePart);
    if (consumable) filter.consumable = new mongoose.Types.ObjectId(consumable);
    if (tool) filter.tool = new mongoose.Types.ObjectId(tool);
    if (user) filter.user = new mongoose.Types.ObjectId(user);

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      filter.$or = [
        { employeeName: searchRegex },
        { department: searchRegex },
        { machine: searchRegex },
        { receivedBy: searchRegex },
        { releasedBy: searchRegex },
        { reference: searchRegex },
        { remarks: searchRegex },
        { adjustmentReason: searchRegex },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build Mongoose sort object from comma-separated string e.g. "-createdAt,-date"
    const buildSortObj = (sortStr) => {
      const obj = {};
      for (const part of String(sortStr).split(",")) {
        const trimmed = part.trim();
        if (trimmed.startsWith("-")) obj[trimmed.slice(1)] = -1;
        else obj[trimmed] = 1;
      }
      return obj;
    };
    const sortObj = buildSortObj(sort);

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate("sparePart", "name sku category")
        .populate("sparePart.category", "name")
        .populate("consumable", "name sku unit")
        .populate("tool", "name toolCode")
        .populate("user", "fullName email role"),
      Transaction.countDocuments(filter),
    ]);

    const formatted = transactions.map(formatItemInfo);

    res.status(200).json({
      success: true,
      data: formatted,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("getTransactions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching transactions",
    });
  }
};

export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findById(id)
      .populate("sparePart", "name sku category quantity minStockLevel unitPrice")
      .populate("sparePart.category", "name")
      .populate("consumable", "name sku unit quantity minStockLevel unitPrice")
      .populate("tool", "name toolCode category status location")
      .populate("user", "fullName email role");

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.status(200).json({
      success: true,
      data: formatItemInfo(transaction),
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }
    console.error("getTransactionById error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching transaction",
    });
  }
};

export const getSparePartTransactionHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { fromDate, toDate, page = 1, limit = 20 } = req.query;

    const filter = {
      $or: [{ sparePart: new mongoose.Types.ObjectId(id) }, { itemType: "sparePart" }],
      sparePart: new mongoose.Types.ObjectId(id),
    };

    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("user", "fullName email"),
      Transaction.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("getSparePartTransactionHistory error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching transaction history",
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/transactions/monthly-sheet?month=8&year=2026&itemType=sparePart&category=<id>
//
// Returns the Excel-style monthly inventory sheet:
//   For every active part (spare part or consumable) that had any movement OR
//   a non-zero beginning inventory in the requested month, returns:
//     - partId, partName, sku, unit, categoryName
//     - beginningInventory  (balance just before the 1st of the month)
//     - days[1..31]: { received, withdraw, balance }
//     - remarks
// ---------------------------------------------------------------------------
export const getMonthlySheet = async (req, res) => {
  try {
    const now = new Date();
    const monthParam = parseInt(req.query.month ?? now.getMonth() + 1, 10); // 1-based
    const yearParam  = parseInt(req.query.year  ?? now.getFullYear(),      10);
    const itemTypeParam = req.query.itemType || "sparePart"; // sparePart | consumable
    const categoryParam = req.query.category || null;        // ObjectId string, optional

    // Validate month/year
    if (monthParam < 1 || monthParam > 12 || isNaN(monthParam) || isNaN(yearParam)) {
      return res.status(400).json({ success: false, message: "Invalid month or year" });
    }

    // Month window
    const monthStart = new Date(yearParam, monthParam - 1, 1, 0, 0, 0, 0);
    const monthEnd   = new Date(yearParam, monthParam,     0, 23, 59, 59, 999); // last day
    const daysInMonth = monthEnd.getDate();

    // -----------------------------------------------------------------------
    // 1. Load all parts of the requested type (optionally filtered by category)
    // -----------------------------------------------------------------------
    let Model, txItemField, txTypes;
    if (itemTypeParam === "consumable") {
      Model        = Consumable;
      txItemField  = "consumable";
      txTypes      = ["consumableStockIn", "consumableRelease", "consumableAdjustment"];
    } else {
      Model        = SparePart;
      txItemField  = "sparePart";
      txTypes      = ["stockIn", "stockOut", "adjustment"];
    }

    const partFilter = {};
    if (categoryParam && mongoose.Types.ObjectId.isValid(categoryParam)) {
      partFilter.category = new mongoose.Types.ObjectId(categoryParam);
    }

    const parts = await Model.find(partFilter)
      .populate("category", "name")
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    if (parts.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          month: monthParam,
          year: yearParam,
          daysInMonth,
          itemType: itemTypeParam,
          rows: [],
        },
      });
    }

    const partIds = parts.map((p) => p._id);

    // -----------------------------------------------------------------------
    // 2. Fetch all transactions for these parts in the target month
    // -----------------------------------------------------------------------
    const monthTxs = await Transaction.find({
      [txItemField]: { $in: partIds },
      type: { $in: txTypes },
      date: { $gte: monthStart, $lte: monthEnd },
    })
      .sort({ date: 1 })
      .lean();

    // -----------------------------------------------------------------------
    // 3. For every part, compute Beginning Inventory (balance just before
    //    monthStart) = current quantity ± transactions that happened AFTER
    //    monthStart (walk backwards in time from the current balance).
    //
    //    Alternatively: fetch all transactions AFTER monthEnd for each part
    //    and subtract/add them from the current balance. Simpler & correct
    //    because we only need one aggregate query.
    // -----------------------------------------------------------------------
    const afterMonthTxs = await Transaction.find({
      [txItemField]: { $in: partIds },
      type: { $in: txTypes },
      date: { $gt: monthEnd },
    }).lean();

    // Build map: partId → currentQuantity
    const currentQtyMap = {};
    for (const p of parts) {
      currentQtyMap[p._id.toString()] = p.quantity ?? 0;
    }

    // Build map: partId → net delta of transactions AFTER monthEnd
    //   stockIn  / consumableStockIn → +qty (has been added since month end)
    //   stockOut / consumableRelease → -qty
    //   adjustment → depends on adjustmentType
    const afterDeltaMap = {};
    for (const tx of afterMonthTxs) {
      const pid = tx[txItemField]?.toString();
      if (!pid) continue;
      if (!(pid in afterDeltaMap)) afterDeltaMap[pid] = 0;
      const delta = txDelta(tx);
      afterDeltaMap[pid] += delta;
    }

    // BI = currentQty - afterDelta (reverse-engineering balance before month)
    const biMap = {};
    for (const p of parts) {
      const pid = p._id.toString();
      biMap[pid] = (currentQtyMap[pid] ?? 0) - (afterDeltaMap[pid] ?? 0);
    }

    // -----------------------------------------------------------------------
    // 4. Group this month's transactions by part → by day
    // -----------------------------------------------------------------------
    // monthTxsByPart: Map<partIdStr, tx[]>
    const monthTxsByPart = {};
    for (const tx of monthTxs) {
      const pid = tx[txItemField]?.toString();
      if (!pid) continue;
      if (!monthTxsByPart[pid]) monthTxsByPart[pid] = [];
      monthTxsByPart[pid].push(tx);
    }

    // -----------------------------------------------------------------------
    // 5. Build the row for each part
    // -----------------------------------------------------------------------
    const rows = [];

    for (const part of parts) {
      const pid        = part._id.toString();
      const partTxs    = monthTxsByPart[pid] || [];
      const bi         = biMap[pid] ?? 0;

      // Only include parts that had movement this month OR non-zero BI
      if (bi === 0 && partTxs.length === 0) continue;

      // Aggregate by calendar day
      const receivedByDay = {}; // day → total received
      const withdrawByDay = {}; // day → total withdrawn

      for (const tx of partTxs) {
        const day = new Date(tx.date).getDate();
        const delta = txDelta(tx);
        if (delta > 0) {
          receivedByDay[day] = (receivedByDay[day] ?? 0) + delta;
        } else if (delta < 0) {
          withdrawByDay[day] = (withdrawByDay[day] ?? 0) + Math.abs(delta);
        }
      }

      // Walk through every day, computing running totals
      const days = {};
      let runningReceived = 0;
      let runningWithdraw = 0;
      let prevBalance     = bi;

      for (let d = 1; d <= daysInMonth; d++) {
        const rec = receivedByDay[d] ?? 0;
        const wth = withdrawByDay[d] ?? 0;
        runningReceived += rec;
        runningWithdraw += wth;
        const balance = prevBalance + rec - wth;
        days[d] = {
          received:         rec,
          runningReceived,
          withdraw:         wth,
          runningWithdraw,
          balance,
        };
        prevBalance = balance;
      }

      rows.push({
        partId:       pid,
        partName:     part.name,
        sku:          part.sku ?? part.toolCode ?? "",
        unit:         part.unit ?? "",
        categoryName: part.category?.name ?? "",
        beginningInventory: bi,
        days,
        remarks:      "",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        month:      monthParam,
        year:       yearParam,
        daysInMonth,
        itemType:   itemTypeParam,
        rows,
      },
    });
  } catch (error) {
    console.error("getMonthlySheet error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while building monthly sheet",
    });
  }
};

// Helper: net inventory delta for a single transaction
function txDelta(tx) {
  const type = tx.type;
  if (type === "stockIn" || type === "consumableStockIn") return tx.quantity;
  if (type === "stockOut" || type === "consumableRelease") return -tx.quantity;
  if (type === "adjustment" || type === "consumableAdjustment") {
    if (tx.adjustmentType === "increase") return tx.quantity;
    if (tx.adjustmentType === "decrease") return -tx.quantity;
    // "set" type — we cannot easily reverse-engineer BI from a set; skip
    return 0;
  }
  return 0;
}
