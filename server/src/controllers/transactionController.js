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
// Returns the Excel-style monthly inventory sheet.
//
// Beginning Inventory (B.I.) strategy:
//   B.I. = balanceAfter of the last transaction recorded BEFORE monthStart.
//   It is a fixed historical value for the entire month and never changes.
//   The daily balance then carries forward: balance[d] = balance[d-1] + in − out.
//
// This makes every daily balance derivable purely from transaction history
// and guarantees the final day's balance matches the Spare Parts module qty.
// ---------------------------------------------------------------------------
export const getMonthlySheet = async (req, res) => {
  try {
    const now = new Date();
    const monthParam    = parseInt(req.query.month ?? now.getMonth() + 1, 10); // 1-based
    const yearParam     = parseInt(req.query.year  ?? now.getFullYear(),      10);
    const itemTypeParam = req.query.itemType || "sparePart"; // sparePart | consumable
    const categoryParam = req.query.category || null;        // ObjectId string, optional

    // Validate month/year
    if (monthParam < 1 || monthParam > 12 || isNaN(monthParam) || isNaN(yearParam)) {
      return res.status(400).json({ success: false, message: "Invalid month or year" });
    }

    // Month window
    const monthStart  = new Date(yearParam, monthParam - 1, 1, 0, 0, 0, 0);
    const monthEnd    = new Date(yearParam, monthParam,     0, 23, 59, 59, 999);
    const daysInMonth = monthEnd.getDate();

    // -----------------------------------------------------------------------
    // 1. Resolve model, transaction field name, and relevant tx types
    // -----------------------------------------------------------------------
    let Model, txItemField, txTypes;
    if (itemTypeParam === "consumable") {
      Model       = Consumable;
      txItemField = "consumable";
      txTypes     = ["consumableStockIn", "consumableRelease", "consumableAdjustment"];
    } else {
      Model       = SparePart;
      txItemField = "sparePart";
      txTypes     = ["stockIn", "stockOut", "adjustment"];
    }

    const partFilter = { status: "active" };
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
        data: { month: monthParam, year: yearParam, daysInMonth, itemType: itemTypeParam, rows: [] },
      });
    }

    const partIds = parts.map((p) => p._id);

    // -----------------------------------------------------------------------
    // 2. Fetch this month's transactions (sorted earliest-first for day walk)
    // -----------------------------------------------------------------------
    const monthTxs = await Transaction.find({
      [txItemField]: { $in: partIds },
      type:          { $in: txTypes },
      date:          { $gte: monthStart, $lte: monthEnd },
    })
      .sort({ date: 1, createdAt: 1 })
      .lean();

    // -----------------------------------------------------------------------
    // 3. Compute Beginning Inventory (B.I.) for each part.
    //
    //    B.I. = inventory balance at the start of monthStart — a fixed
    //    historical value that never changes within the month view.
    //
    //    Algorithm (forward-replay, most reliable):
    //      A. Last pre-month tx has balanceAfter → use it directly.
    //      B. Pre-month txs exist but last one has no balanceAfter → replay
    //         all pre-month deltas from 0, anchoring on any balanceAfter
    //         found along the way to correct drift.
    //      C. No pre-month txs → undo in-month + post-month txs from the
    //         current live quantity to back-calculate B.I.
    // -----------------------------------------------------------------------

    // Fetch ALL pre-month transactions, sorted oldest-first
    const preMonthTxs = await Transaction.find({
      [txItemField]: { $in: partIds },
      type:          { $in: txTypes },
      date:          { $lt: monthStart },
    })
      .sort({ date: 1, createdAt: 1 })
      .lean();

    // Fetch ALL post-month transactions (needed for strategy C), oldest-first
    const postMonthTxs = await Transaction.find({
      [txItemField]: { $in: partIds },
      type:          { $in: txTypes },
      date:          { $gt: monthEnd },
    })
      .sort({ date: 1, createdAt: 1 })
      .lean();

    // Group by part
    const preTxsByPart = {};
    for (const tx of preMonthTxs) {
      const pid = tx[txItemField]?.toString();
      if (!pid) continue;
      if (!preTxsByPart[pid]) preTxsByPart[pid] = [];
      preTxsByPart[pid].push(tx);
    }

    const postTxsByPart = {};
    for (const tx of postMonthTxs) {
      const pid = tx[txItemField]?.toString();
      if (!pid) continue;
      if (!postTxsByPart[pid]) postTxsByPart[pid] = [];
      postTxsByPart[pid].push(tx);
    }

    // Also group in-month txs by part (needed for strategy C and step 5)
    const monthTxsByPart = {};
    for (const tx of monthTxs) {
      const pid = tx[txItemField]?.toString();
      if (!pid) continue;
      if (!monthTxsByPart[pid]) monthTxsByPart[pid] = [];
      monthTxsByPart[pid].push(tx);
    }

    // Build the BI map
    const biMap = {};
    for (const part of parts) {
      const pid    = part._id.toString();
      const preTxs = preTxsByPart[pid] || [];

      if (preTxs.length > 0) {
        // Strategy A: last pre-month tx has a reliable balanceAfter
        const lastPreTx = preTxs[preTxs.length - 1];
        if (lastPreTx.balanceAfter != null) {
          biMap[pid] = lastPreTx.balanceAfter;
          continue;
        }

        // Strategy B: replay all pre-month deltas forward from 0,
        // anchoring on balanceAfter wherever it exists.
        let qty = 0;
        for (const tx of preTxs) {
          if (tx.balanceAfter != null) {
            qty = tx.balanceAfter; // hard anchor
          } else {
            qty += txDelta(tx);
          }
        }
        biMap[pid] = qty;
        continue;
      }

      // Strategy C: no pre-month history — undo in-month + post-month txs
      // from the current live quantity (walk latest-first).
      const forwardTxs = [
        ...(monthTxsByPart[pid]  || []),
        ...(postTxsByPart[pid]   || []),
      ].sort((a, b) => {
        const d = new Date(a.date) - new Date(b.date);
        return d !== 0 ? d : new Date(a.createdAt) - new Date(b.createdAt);
      }).reverse(); // now latest-first

      let qty = part.quantity ?? 0;
      for (const tx of forwardTxs) {
        if (tx.balanceAfter != null) {
          // Anchor: qty before this tx = balanceAfter − delta
          qty = tx.balanceAfter - txDelta(tx);
        } else {
          qty -= txDelta(tx);
        }
      }
      biMap[pid] = qty;
    }

    // -----------------------------------------------------------------------
    // 4. Build the row for each part
    // -----------------------------------------------------------------------
    const rows = [];

    for (const part of parts) {
      const pid     = part._id.toString();
      const partTxs = monthTxsByPart[pid] || [];
      const bi      = biMap[pid] ?? 0;

      // Only include parts with movement this month OR non-zero BI
      if (bi === 0 && partTxs.length === 0) continue;

      // Aggregate received / withdrawn by calendar day
      const receivedByDay = {};
      const withdrawByDay = {};

      // Sort within the day so we can use balanceAfter to infer "set" deltas
      // (monthTxs is already sorted date asc, createdAt asc)
      let runningBalance = bi; // tracks balance as we walk through the month txs

      for (const tx of partTxs) {
        const day = new Date(tx.date).getDate();
        let delta;

        if (
          (tx.type === "adjustment" || tx.type === "consumableAdjustment") &&
          tx.adjustmentType === "set" &&
          tx.balanceAfter != null
        ) {
          // "set" adjustment: compute effective delta from the stored balanceAfter
          delta = tx.balanceAfter - runningBalance;
        } else {
          delta = txDelta(tx);
        }

        runningBalance += delta;

        if (delta > 0) {
          receivedByDay[day] = (receivedByDay[day] ?? 0) + delta;
        } else if (delta < 0) {
          withdrawByDay[day] = (withdrawByDay[day] ?? 0) + Math.abs(delta);
        }
      }

      // Walk every day, building running totals and daily balance
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
        days[d] = { received: rec, runningReceived, withdraw: wth, runningWithdraw, balance };
        prevBalance = balance;
      }

      rows.push({
        partId:             pid,
        partName:           part.name,
        sku:                part.sku ?? part.toolCode ?? "",
        unit:               part.unit ?? "",
        categoryName:       part.category?.name ?? "",
        sortOrder:          part.sortOrder ?? 0,
        beginningInventory: bi,
        days,
        remarks:            "",
      });
    }

    return res.status(200).json({
      success: true,
      data: { month: monthParam, year: yearParam, daysInMonth, itemType: itemTypeParam, rows },
    });
  } catch (error) {
    console.error("getMonthlySheet error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while building monthly sheet",
    });
  }
};

// ---------------------------------------------------------------------------
// Helper: net inventory delta for a single transaction.
// For "set" adjustments, returns 0 — the daily walk uses balanceAfter directly
// when available, so set adjustments don't need a meaningful delta here.
// ---------------------------------------------------------------------------
function txDelta(tx) {
  const type = tx.type;
  if (type === "stockIn"  || type === "consumableStockIn")  return  tx.quantity;
  if (type === "stockOut" || type === "consumableRelease")  return -tx.quantity;
  if (type === "adjustment" || type === "consumableAdjustment") {
    if (tx.adjustmentType === "increase") return  tx.quantity;
    if (tx.adjustmentType === "decrease") return -tx.quantity;
    if (tx.adjustmentType === "set") {
      // For daily aggregation: treat "set" as bringing balance to balanceAfter.
      // We approximate the delta as balanceAfter minus what it was before.
      // However since we don't track "before" here, the caller (daily walk)
      // handles "set" by using balanceAfter directly when needed.
      return 0;
    }
  }
  return 0;
}
