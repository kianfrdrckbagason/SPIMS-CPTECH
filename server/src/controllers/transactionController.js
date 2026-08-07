import Transaction from "../models/Transaction.js";
import SparePart from "../models/SparePart.js";
import Consumable from "../models/Consumable.js";
import ToolInventory from "../models/ToolInventory.js";
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
      date,
      sparePart,
      consumable,
      tool,
      search,
      user,
      page = 1,
      limit = 20,
      sort = "-date",
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

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    } else if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
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

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort(sort)
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
