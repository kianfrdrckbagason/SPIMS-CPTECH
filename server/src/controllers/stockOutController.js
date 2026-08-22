import SparePart from "../models/SparePart.js";
import Consumable from "../models/Consumable.js";
import Transaction from "../models/Transaction.js";
import Notification from "../models/Notification.js";

// Movement classification thresholds for stock status calculation
// Fast:   qty >= 10 = Normal, qty 1-9  = Low Stock, qty 0 = Out of Stock
// Medium: qty >= 5  = Normal, qty 1-4  = Low Stock, qty 0 = Out of Stock
// Low:    qty >= 2  = Normal, qty 1    = Low Stock, qty 0 = Out of Stock
const MOVEMENT_THRESHOLDS = {
  fast:   { normal: 10, low: 9,  out: 0 },
  medium: { normal: 5,  low: 4,  out: 0 },
  low:    { normal: 2,  low: 1,  out: 0 },
};

const getStockStatus = (quantity, minStockLevel, movementClassification = "medium") => {
  const t = MOVEMENT_THRESHOLDS[movementClassification] || MOVEMENT_THRESHOLDS.medium;
  if (quantity <= t.out) return "red";
  if (quantity <= t.low) return "orange";
  return "green";
};

const createStockNotification = async (
  item,
  itemType,
  oldStatus,
  newStatus,
  transactionId,
  userId
) => {
  const modelType = itemType === "sparePart" ? "SparePart" : "Consumable";
  const itemName = item.name;
  const itemSku = item.sku;

  if (newStatus === "green" && oldStatus !== "green") {
    await Notification.create({
      type: "newStock",
      severity: "info",
      title: `${itemName} Stock Replenished`,
      message: `${itemName} (SKU: ${itemSku}) stock has been replenished. Current quantity: ${item.quantity}.`,
      reference: {
        modelType,
        modelId: item._id,
      },
      user: userId,
    });
    return;
  }

  if (newStatus === "orange" && oldStatus === "green") {
    await Notification.create({
      type: "lowStock",
      severity: "warning",
      title: `Low Stock Alert: ${itemName}`,
      message: `${itemName} (SKU: ${itemSku}) is running low. Current quantity: ${item.quantity}, Minimum: ${item.minStockLevel}.`,
      reference: {
        modelType,
        modelId: item._id,
      },
      user: userId,
    });
    return;
  }

  if (newStatus === "red" && oldStatus !== "red") {
    await Notification.create({
      type: "outOfStock",
      severity: "critical",
      title: `Out of Stock: ${itemName}`,
      message: `${itemName} (SKU: ${itemSku}) is out of stock. Current quantity: ${item.quantity}.`,
      reference: {
        modelType,
        modelId: item._id,
      },
      user: userId,
    });
  }
};

export const recordStockOut = async (req, res) => {
  try {
    const {
      employeeName,
      department,
      machine,
      sparePart,
      quantity,
      releasedBy,
      date,
      remarks,
      reference,
    } = req.body;

    if (!sparePart || !quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Spare part ID and valid quantity are required",
      });
    }

    const part = await SparePart.findById(sparePart);
    if (!part) {
      return res.status(404).json({
        success: false,
        message: "Spare part not found",
      });
    }

    if (part.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${part.quantity}, Requested: ${quantity}`,
      });
    }

    const oldStatus = getStockStatus(part.quantity, part.minStockLevel, part.movementClassification);

    part.quantity = part.quantity - quantity;
    await part.save();

    const newStatus = getStockStatus(part.quantity, part.minStockLevel, part.movementClassification);

    const transaction = await Transaction.create({
      type: "stockOut",
      itemType: "sparePart",
      sparePart: part._id,
      quantity,
      unitPrice: part.unitPrice || 0,
      balanceAfter: part.quantity,
      date: date || Date.now(),
      employeeName,
      department,
      machine: machine || part.machine,
      releasedBy: releasedBy || (req.user && req.user.fullName) || "System",
      remarks,
      reference,
      user: req.user._id,
    });

    await transaction.populate("sparePart", "name sku category");
    await transaction.populate("sparePart.category", "name");
    await transaction.populate("user", "fullName email");

    await createStockNotification(part, "sparePart", oldStatus, newStatus, transaction._id, req.user._id);

    if (oldStatus !== newStatus && (newStatus === "orange" || newStatus === "red")) {
      await Notification.create({
        type: "stockOut",
        severity: newStatus === "red" ? "critical" : "warning",
        title: `Stock Out: ${part.name}`,
        message: `${quantity} unit(s) of ${part.name} (SKU: ${part.sku}) issued. Remaining stock: ${part.quantity}.`,
        reference: {
          modelType: "Transaction",
          modelId: transaction._id,
        },
        user: req.user._id,
      });
    }

    res.status(201).json({
      success: true,
      message: "Stock out recorded successfully",
      data: {
        transaction,
        sparePart: part,
      },
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

    console.error("recordStockOut error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while recording stock out",
    });
  }
};

export const consumableRelease = async (req, res) => {
  try {
    const {
      employeeName,
      department,
      machine,
      consumable,
      quantity,
      releasedBy,
      date,
      remarks,
      reference,
    } = req.body;

    if (!consumable || !quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Consumable ID and valid quantity are required",
      });
    }

    const item = await Consumable.findById(consumable);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Consumable not found",
      });
    }

    if (item.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${item.quantity}, Requested: ${quantity}`,
      });
    }

    const oldStatus = getStockStatus(item.quantity, item.minStockLevel, item.movementClassification);

    item.quantity = item.quantity - quantity;
    await item.save();

    const newStatus = getStockStatus(item.quantity, item.minStockLevel, item.movementClassification);

    const transaction = await Transaction.create({
      type: "consumableRelease",
      itemType: "consumable",
      consumable: item._id,
      quantity,
      unitPrice: item.unitPrice || 0,
      balanceAfter: item.quantity,
      date: date || Date.now(),
      employeeName,
      department,
      machine,
      releasedBy: releasedBy || (req.user && req.user.fullName) || "System",
      remarks,
      reference,
      user: req.user._id,
    });

    await transaction.populate("consumable", "name sku unit");
    await transaction.populate("user", "fullName email");

    await createStockNotification(item, "consumable", oldStatus, newStatus, transaction._id, req.user._id);

    if (oldStatus !== newStatus && (newStatus === "orange" || newStatus === "red")) {
      await Notification.create({
        type: "stockOut",
        severity: newStatus === "red" ? "critical" : "warning",
        title: `Stock Out: ${item.name}`,
        message: `${quantity} unit(s) of ${item.name} (SKU: ${item.sku}) issued. Remaining stock: ${item.quantity}.`,
        reference: {
          modelType: "Transaction",
          modelId: transaction._id,
        },
        user: req.user._id,
      });
    }

    res.status(201).json({
      success: true,
      message: "Consumable release recorded successfully",
      data: {
        transaction,
        consumable: item,
      },
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

    console.error("consumableRelease error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while recording consumable release",
    });
  }
};
