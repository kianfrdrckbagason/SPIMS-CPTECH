import SparePart from "../models/SparePart.js";
import Consumable from "../models/Consumable.js";
import Transaction from "../models/Transaction.js";
import Notification from "../models/Notification.js";

const getStockStatus = (quantity, minStockLevel) => {
  if (quantity <= 0) return "red";
  if (quantity <= minStockLevel) return "orange";
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

export const recordStockIn = async (req, res) => {
  try {
    const { sparePart, quantity, receivedBy, date, remarks, reference, unitPrice } = req.body;

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

    const oldStatus = getStockStatus(part.quantity, part.minStockLevel);

    part.quantity = part.quantity + quantity;
    await part.save();

    const newStatus = getStockStatus(part.quantity, part.minStockLevel);

    const transaction = await Transaction.create({
      type: "stockIn",
      itemType: "sparePart",
      sparePart: part._id,
      quantity,
      unitPrice: unitPrice || part.unitPrice || 0,
      balanceAfter: part.quantity,
      date: date || Date.now(),
      receivedBy: receivedBy || (req.user && req.user.fullName) || "System",
      remarks,
      reference,
      user: req.user._id,
    });

    await transaction.populate("sparePart", "name sku category");
    await transaction.populate("sparePart.category", "name");
    await transaction.populate("user", "fullName email");

    await createStockNotification(part, "sparePart", oldStatus, newStatus, transaction._id, req.user._id);

    res.status(201).json({
      success: true,
      message: "Stock in recorded successfully",
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

    console.error("recordStockIn error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while recording stock in",
    });
  }
};

export const consumableStockIn = async (req, res) => {
  try {
    const { consumable, quantity, receivedBy, date, remarks, reference, unitPrice } = req.body;

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

    const oldStatus = getStockStatus(item.quantity, item.minStockLevel);

    item.quantity = item.quantity + quantity;
    await item.save();

    const newStatus = getStockStatus(item.quantity, item.minStockLevel);

    const transaction = await Transaction.create({
      type: "consumableStockIn",
      itemType: "consumable",
      consumable: item._id,
      quantity,
      unitPrice: unitPrice || item.unitPrice || 0,
      balanceAfter: item.quantity,
      date: date || Date.now(),
      receivedBy: receivedBy || (req.user && req.user.fullName) || "System",
      remarks,
      reference,
      user: req.user._id,
    });

    await transaction.populate("consumable", "name sku unit");
    await transaction.populate("user", "fullName email");

    await createStockNotification(item, "consumable", oldStatus, newStatus, transaction._id, req.user._id);

    res.status(201).json({
      success: true,
      message: "Consumable stock in recorded successfully",
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

    console.error("consumableStockIn error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while recording consumable stock in",
    });
  }
};
