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

export const adjustSparePart = async (req, res) => {
  try {
    const {
      sparePart,
      adjustmentType,
      quantity,
      adjustmentReason,
      date,
      remarks,
      reference,
    } = req.body;

    if (!sparePart || !adjustmentType || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Spare part ID, adjustment type, and quantity are required",
      });
    }

    if (!adjustmentReason || adjustmentReason.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Adjustment reason is required",
      });
    }

    if (!["increase", "decrease", "set"].includes(adjustmentType)) {
      return res.status(400).json({
        success: false,
        message: "Adjustment type must be 'increase', 'decrease', or 'set'",
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive number",
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
    const oldQuantity = part.quantity;
    let newQuantity;
    let txQuantity = quantity;

    switch (adjustmentType) {
      case "increase":
        newQuantity = part.quantity + quantity;
        break;
      case "decrease":
        if (part.quantity < quantity) {
          return res.status(400).json({
            success: false,
            message: `Cannot decrease by ${quantity}. Current quantity: ${part.quantity}`,
          });
        }
        newQuantity = part.quantity - quantity;
        break;
      case "set":
        newQuantity = quantity;
        txQuantity = Math.abs(newQuantity - oldQuantity);
        if (txQuantity === 0) {
          return res.status(400).json({
            success: false,
            message: "Set quantity is the same as current quantity. No adjustment needed.",
          });
        }
        break;
    }

    part.quantity = newQuantity;
    await part.save();

    const newStatus = getStockStatus(part.quantity, part.minStockLevel);

    const transaction = await Transaction.create({
      type: "adjustment",
      itemType: "sparePart",
      sparePart: part._id,
      quantity: txQuantity,
      unitPrice: part.unitPrice || 0,
      balanceAfter: part.quantity,
      date: date || Date.now(),
      adjustmentReason,
      adjustmentType,
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
      message: "Spare part adjustment recorded successfully",
      data: {
        transaction,
        sparePart: part,
        oldQuantity,
        newQuantity,
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

    console.error("adjustSparePart error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while recording spare part adjustment",
    });
  }
};

export const adjustConsumable = async (req, res) => {
  try {
    const {
      consumable,
      adjustmentType,
      quantity,
      adjustmentReason,
      date,
      remarks,
      reference,
    } = req.body;

    if (!consumable || !adjustmentType || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Consumable ID, adjustment type, and quantity are required",
      });
    }

    if (!adjustmentReason || adjustmentReason.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Adjustment reason is required",
      });
    }

    if (!["increase", "decrease", "set"].includes(adjustmentType)) {
      return res.status(400).json({
        success: false,
        message: "Adjustment type must be 'increase', 'decrease', or 'set'",
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive number",
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
    const oldQuantity = item.quantity;
    let newQuantity;
    let txQuantity = quantity;

    switch (adjustmentType) {
      case "increase":
        newQuantity = item.quantity + quantity;
        break;
      case "decrease":
        if (item.quantity < quantity) {
          return res.status(400).json({
            success: false,
            message: `Cannot decrease by ${quantity}. Current quantity: ${item.quantity}`,
          });
        }
        newQuantity = item.quantity - quantity;
        break;
      case "set":
        newQuantity = quantity;
        txQuantity = Math.abs(newQuantity - oldQuantity);
        if (txQuantity === 0) {
          return res.status(400).json({
            success: false,
            message: "Set quantity is the same as current quantity. No adjustment needed.",
          });
        }
        break;
    }

    item.quantity = newQuantity;
    await item.save();

    const newStatus = getStockStatus(item.quantity, item.minStockLevel);

    const transaction = await Transaction.create({
      type: "consumableAdjustment",
      itemType: "consumable",
      consumable: item._id,
      quantity: txQuantity,
      unitPrice: item.unitPrice || 0,
      balanceAfter: item.quantity,
      date: date || Date.now(),
      adjustmentReason,
      adjustmentType,
      remarks,
      reference,
      user: req.user._id,
    });

    await transaction.populate("consumable", "name sku unit");
    await transaction.populate("user", "fullName email");

    await createStockNotification(item, "consumable", oldStatus, newStatus, transaction._id, req.user._id);

    res.status(201).json({
      success: true,
      message: "Consumable adjustment recorded successfully",
      data: {
        transaction,
        consumable: item,
        oldQuantity,
        newQuantity,
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

    console.error("adjustConsumable error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while recording consumable adjustment",
    });
  }
};
