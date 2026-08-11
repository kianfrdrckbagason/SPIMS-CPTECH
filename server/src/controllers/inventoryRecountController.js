import InventoryRecount from "../models/InventoryRecount.js";
import SparePart from "../models/SparePart.js";
import Transaction from "../models/Transaction.js";
import Notification from "../models/Notification.js";
import { validationResult } from "express-validator";

// ── Create a new recount session ──────────────────────────────────────────────
// Loads current system quantities for all (or category-filtered) spare parts
// and snapshots them as the starting point for the physical count.
export const createRecount = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  try {
    const { recountDate, title, category, preparedBy, checkedBy, remarks } = req.body;

    const partQuery = { status: { $in: ["active", "inactive"] } };
    if (category) partQuery.category = category;

    const parts = await SparePart.find(partQuery)
      .populate("category", "name")
      .sort({ name: 1 });

    if (parts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No spare parts found for the selected filter.",
      });
    }

    const items = parts.map((p) => ({
      sparePart: p._id,
      systemQty: p.quantity,
      actualQty: null,
      difference: null,
      status: "pending",
      adjustmentCreated: false,
    }));

    const recount = await InventoryRecount.create({
      recountDate: recountDate || new Date(),
      title: title || "",
      category: category || null,
      status: "draft",
      items,
      preparedBy: preparedBy || req.user.fullName || "",
      checkedBy: checkedBy || "",
      remarks: remarks || "",
      createdBy: req.user._id,
    });

    await recount.populate([
      { path: "items.sparePart", select: "name sku category quantity", populate: { path: "category", select: "name" } },
      { path: "category", select: "name" },
      { path: "createdBy", select: "fullName" },
    ]);

    res.status(201).json({
      success: true,
      message: "Recount session created successfully",
      data: recount,
    });
  } catch (error) {
    console.error("createRecount error:", error);
    res.status(500).json({ success: false, message: "Server error creating recount" });
  }
};

// ── List all recount sessions ─────────────────────────────────────────────────
export const getRecounts = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [recounts, total] = await Promise.all([
      InventoryRecount.find(filter)
        .sort({ recountDate: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate("category", "name")
        .populate("createdBy", "fullName"),
      InventoryRecount.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: recounts,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("getRecounts error:", error);
    res.status(500).json({ success: false, message: "Server error fetching recounts" });
  }
};

// ── Get single recount session ────────────────────────────────────────────────
export const getRecountById = async (req, res) => {
  try {
    const recount = await InventoryRecount.findById(req.params.id)
      .populate({ path: "items.sparePart", select: "name sku quantity", populate: { path: "category", select: "name" } })
      .populate("category", "name")
      .populate("createdBy", "fullName");

    if (!recount) {
      return res.status(404).json({ success: false, message: "Recount not found" });
    }

    res.status(200).json({ success: true, data: recount });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ success: false, message: "Recount not found" });
    }
    console.error("getRecountById error:", error);
    res.status(500).json({ success: false, message: "Server error fetching recount" });
  }
};

// ── Submit actual counts for one or more items ────────────────────────────────
// Body: { counts: [{ itemId, actualQty }] }
export const submitCounts = async (req, res) => {
  try {
    const { counts } = req.body;

    if (!Array.isArray(counts) || counts.length === 0) {
      return res.status(400).json({ success: false, message: "counts array is required" });
    }

    const recount = await InventoryRecount.findById(req.params.id);
    if (!recount) {
      return res.status(404).json({ success: false, message: "Recount not found" });
    }
    if (recount.status === "completed") {
      return res.status(400).json({ success: false, message: "Cannot modify a completed recount" });
    }

    counts.forEach(({ itemId, actualQty }) => {
      const item = recount.items.id(itemId);
      if (!item) return;
      const qty = Number(actualQty);
      if (isNaN(qty) || qty < 0) return;
      item.actualQty = qty;
      item.difference = qty - item.systemQty;
      item.status = item.difference === 0 ? "matched" : "discrepancy";
    });

    // Advance status to in_progress once any item has been counted
    if (recount.status === "draft") {
      recount.status = "in_progress";
    }

    await recount.save();

    await recount.populate([
      { path: "items.sparePart", select: "name sku quantity", populate: { path: "category", select: "name" } },
      { path: "category", select: "name" },
    ]);

    res.status(200).json({ success: true, message: "Counts recorded", data: recount });
  } catch (error) {
    console.error("submitCounts error:", error);
    res.status(500).json({ success: false, message: "Server error submitting counts" });
  }
};

// ── Complete a recount session ────────────────────────────────────────────────
export const completeRecount = async (req, res) => {
  try {
    const recount = await InventoryRecount.findById(req.params.id);
    if (!recount) {
      return res.status(404).json({ success: false, message: "Recount not found" });
    }
    if (recount.status === "completed") {
      return res.status(400).json({ success: false, message: "Recount is already completed" });
    }

    const uncounted = recount.items.filter((i) => i.actualQty === null).length;
    if (uncounted > 0) {
      return res.status(400).json({
        success: false,
        message: `${uncounted} item(s) have not been counted yet. Count all items before completing.`,
      });
    }

    const { checkedBy, remarks } = req.body;
    if (checkedBy) recount.checkedBy = checkedBy;
    if (remarks !== undefined) recount.remarks = remarks;
    recount.status = "completed";

    await recount.save();

    res.status(200).json({ success: true, message: "Recount completed", data: recount });
  } catch (error) {
    console.error("completeRecount error:", error);
    res.status(500).json({ success: false, message: "Server error completing recount" });
  }
};

// ── Apply adjustment for a single discrepant item ─────────────────────────────
// Creates an inventory adjustment transaction and updates the spare part qty.
export const applyAdjustment = async (req, res) => {
  try {
    const { itemId } = req.body;
    if (!itemId) {
      return res.status(400).json({ success: false, message: "itemId is required" });
    }

    const recount = await InventoryRecount.findById(req.params.id);
    if (!recount) {
      return res.status(404).json({ success: false, message: "Recount not found" });
    }

    const item = recount.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found in recount" });
    }
    if (item.status !== "discrepancy") {
      return res.status(400).json({ success: false, message: "Item has no discrepancy to adjust" });
    }
    if (item.adjustmentCreated) {
      return res.status(400).json({ success: false, message: "Adjustment already applied for this item" });
    }
    if (item.actualQty === null) {
      return res.status(400).json({ success: false, message: "Actual count has not been recorded yet" });
    }

    const part = await SparePart.findById(item.sparePart);
    if (!part) {
      return res.status(404).json({ success: false, message: "Spare part not found" });
    }

    const diff = item.difference; // actualQty - systemQty
    const adjustmentType = diff > 0 ? "increase" : "decrease";
    const adjustQty = Math.abs(diff);

    part.quantity = item.actualQty;
    await part.save();

    const transaction = await Transaction.create({
      type: "adjustment",
      itemType: "sparePart",
      sparePart: part._id,
      quantity: adjustQty,
      unitPrice: part.unitPrice || 0,
      balanceAfter: item.actualQty,
      date: recount.recountDate,
      adjustmentType,
      adjustmentReason: `Physical recount — Recount Date: ${new Date(recount.recountDate).toLocaleDateString()}`,
      remarks: `System Qty: ${item.systemQty} | Actual Qty: ${item.actualQty} | Difference: ${diff}`,
      user: req.user._id,
    });

    // Notify if stock went to low/out after adjustment
    if (item.actualQty === 0) {
      await Notification.create({
        type: "outOfStock",
        severity: "critical",
        title: `Out of Stock after Recount: ${part.name}`,
        message: `Physical recount adjusted ${part.name} to 0. Immediate restocking required.`,
        reference: { modelType: "SparePart", modelId: part._id },
        user: req.user._id,
      });
    } else if (item.actualQty <= part.minStockLevel) {
      await Notification.create({
        type: "lowStock",
        severity: "warning",
        title: `Low Stock after Recount: ${part.name}`,
        message: `Physical recount set ${part.name} to ${item.actualQty} (min: ${part.minStockLevel}).`,
        reference: { modelType: "SparePart", modelId: part._id },
        user: req.user._id,
      });
    }

    item.adjustmentCreated = true;
    await recount.save();

    res.status(200).json({
      success: true,
      message: `Adjustment applied. ${part.name} quantity set to ${item.actualQty}.`,
      data: { transaction, recount },
    });
  } catch (error) {
    console.error("applyAdjustment error:", error);
    res.status(500).json({ success: false, message: "Server error applying adjustment" });
  }
};

// ── Delete a draft recount ────────────────────────────────────────────────────
export const deleteRecount = async (req, res) => {
  try {
    const recount = await InventoryRecount.findById(req.params.id);
    if (!recount) {
      return res.status(404).json({ success: false, message: "Recount not found" });
    }
    if (recount.status !== "draft") {
      return res.status(400).json({ success: false, message: "Only draft recounts can be deleted" });
    }

    await InventoryRecount.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Recount deleted" });
  } catch (error) {
    console.error("deleteRecount error:", error);
    res.status(500).json({ success: false, message: "Server error deleting recount" });
  }
};
