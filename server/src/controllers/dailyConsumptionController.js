import DailyConsumption from "../models/DailyConsumption.js";
import Consumable from "../models/Consumable.js";
import Transaction from "../models/Transaction.js";
import Notification from "../models/Notification.js";
import { validationResult } from "express-validator";

export const createDailyConsumption = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }

  try {
    const {
      date,
      productionLine,
      shift,
      consumable,
      quantityUsed,
      receivedBy,
      remarks,
    } = req.body;

    const consumableItem = await Consumable.findById(consumable);
    if (!consumableItem) {
      return res.status(404).json({
        success: false,
        message: "Consumable not found",
      });
    }

    if (consumableItem.status !== "active") {
      return res.status(400).json({
        success: false,
        message: `Consumable is ${consumableItem.status} and cannot be issued`,
      });
    }

    if (consumableItem.quantity < quantityUsed) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${consumableItem.quantity}, Requested: ${quantityUsed}`,
      });
    }

    const previousQuantity = consumableItem.quantity;
    consumableItem.quantity -= quantityUsed;
    await consumableItem.save();

    const dailyConsumption = await DailyConsumption.create({
      date: date || Date.now(),
      productionLine,
      shift: shift || "morning",
      consumable,
      quantityUsed,
      issuedBy: req.user._id,
      receivedBy,
      remarks,
    });

    await dailyConsumption.populate("consumable", "name sku unit quantity minStockLevel");
    await dailyConsumption.populate("issuedBy", "fullName");

    await Transaction.create({
      type: "consumableRelease",
      itemType: "consumable",
      consumable,
      quantity: quantityUsed,
      unitPrice: consumableItem.unitPrice || 0,
      balanceAfter: consumableItem.quantity,
      date: date || Date.now(),
      department: productionLine,
      machine: shift,
      receivedBy,
      releasedBy: req.user.fullName,
      remarks,
      user: req.user._id,
    });

    const notifications = [];

    if (consumableItem.quantity <= 0) {
      notifications.push({
        type: "outOfStock",
        severity: "critical",
        title: "Consumable Out of Stock",
        message: `${consumableItem.name} (${consumableItem.sku}) is now OUT OF STOCK after releasing ${quantityUsed} ${consumableItem.unit}(s) to ${productionLine} (${shift} shift).`,
        reference: {
          modelType: "DailyConsumption",
          modelId: dailyConsumption._id,
        },
        user: null,
      });
    } else if (consumableItem.quantity <= consumableItem.minStockLevel) {
      notifications.push({
        type: "lowStock",
        severity: "warning",
        title: "Consumable Low Stock",
        message: `${consumableItem.name} (${consumableItem.sku}) is running LOW. Remaining: ${consumableItem.quantity} ${consumableItem.unit}(s) (min level: ${consumableItem.minStockLevel}). Released ${quantityUsed} to ${productionLine} (${shift} shift).`,
        reference: {
          modelType: "DailyConsumption",
          modelId: dailyConsumption._id,
        },
        user: null,
      });
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.status(201).json({
      success: true,
      message: "Daily consumption recorded successfully",
      data: dailyConsumption,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }
    console.error("createDailyConsumption error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while recording daily consumption",
    });
  }
};

export const getDailyConsumptions = async (req, res) => {
  try {
    const {
      date,
      fromDate,
      toDate,
      productionLine,
      shift,
      consumable,
      page = 1,
      limit = 20,
      sort = "-date",
    } = req.query;

    const filter = {};

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    } else if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) {
        filter.date.$gte = new Date(fromDate);
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    if (productionLine) {
      filter.productionLine = { $regex: productionLine, $options: "i" };
    }

    if (shift) {
      filter.shift = shift;
    }

    if (consumable) {
      filter.consumable = consumable;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [consumptions, total] = await Promise.all([
      DailyConsumption.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate("consumable", "name sku unit quantity minStockLevel unitPrice")
        .populate("issuedBy", "fullName email"),
      DailyConsumption.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: consumptions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("getDailyConsumptions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching daily consumptions",
    });
  }
};

export const getMonthlySummary = async (req, res) => {
  try {
    const { year, month } = req.query;

    const now = new Date();
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();
    const targetMonth = month ? parseInt(month, 10) : now.getMonth() + 1;

    if (targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({
        success: false,
        message: "Month must be between 1 and 12",
      });
    }

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const result = await DailyConsumption.aggregate([
      {
        $match: {
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: "$consumable",
          totalQuantityUsed: { $sum: "$quantityUsed" },
          recordCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "consumables",
          localField: "_id",
          foreignField: "_id",
          as: "consumable",
        },
      },
      {
        $unwind: {
          path: "$consumable",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          consumableId: "$_id",
          name: { $ifNull: ["$consumable.name", "Unknown"] },
          sku: { $ifNull: ["$consumable.sku", "N/A"] },
          unit: { $ifNull: ["$consumable.unit", ""] },
          unitPrice: { $ifNull: ["$consumable.unitPrice", 0] },
          totalQuantityUsed: 1,
          recordCount: 1,
          totalValue: {
            $multiply: [
              "$totalQuantityUsed",
              { $ifNull: ["$consumable.unitPrice", 0] },
            ],
          },
        },
      },
      {
        $sort: { totalQuantityUsed: -1 },
      },
    ]);

    const grandTotal = result.reduce(
      (acc, item) => ({
        quantity: acc.quantity + item.totalQuantityUsed,
        records: acc.records + item.recordCount,
        value: acc.value + (item.totalValue || 0),
      }),
      { quantity: 0, records: 0, value: 0 }
    );

    res.status(200).json({
      success: true,
      data: {
        year: targetYear,
        month: targetMonth,
        period: {
          start: startDate,
          end: endDate,
        },
        summary: result,
        grandTotal,
      },
    });
  } catch (error) {
    console.error("getMonthlySummary error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching monthly summary",
    });
  }
};
