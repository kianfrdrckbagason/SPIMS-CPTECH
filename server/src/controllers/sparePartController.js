import SparePart from "../models/SparePart.js";
import Notification from "../models/Notification.js";
import { validationResult } from "express-validator";

const generateSkuFromName = (name) => {
  const cleaned = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const prefix = cleaned.substring(0, 40);
  const suffix = Date.now().toString().slice(-6);
  return `${prefix}-${suffix}`;
};

export const createSparePart = async (req, res) => {
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
      name,
      partNumber,
      sku: rawSku,
      description,
      category,
      machine,
      supplier,
      quantity,
      minStockLevel,
      maxStockLevel,
      unitPrice,
      reorderLevel,
      status,
    } = req.body;

    const sku = rawSku?.trim().toUpperCase() || generateSkuFromName(name);
    const existingSku = await SparePart.findOne({ sku });
    if (existingSku) {
      return res.status(400).json({
        success: false,
        message: "Spare part with this SKU already exists",
      });
    }

    const sparePart = await SparePart.create({
      name,
      partNumber: partNumber ?? 0,
      sku,
      description,
      category,
      machine,
      supplier,
      quantity: quantity ?? 0,
      minStockLevel: minStockLevel ?? 5,
      maxStockLevel,
      unitPrice: unitPrice ?? 0,
      reorderLevel: reorderLevel ?? 10,
      status: status || "active",
    });

    const populated = await SparePart.findById(sparePart._id)
      .populate("category", "name description machine")
      .populate("supplier", "name contactPerson email phone");

    // create a notification for recent activity
    try {
      await Notification.create({
        type: "system",
        severity: "info",
        title: `Spare part created: ${populated.name}`,
        message: `Spare part ${populated.name} (SKU: ${populated.sku || 'N/A'}) was created.`,
        reference: { modelType: "SparePart", modelId: populated._id },
      });
    } catch (nErr) {
      // don't block main response on notification errors
      console.error("Failed to create spare part notification:", nErr);
    }

    res.status(201).json({
      success: true,
      message: "Spare part created successfully",
      data: populated,
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

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Spare part with this SKU already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during spare part creation",
    });
  }
};

export const getSpareParts = async (req, res) => {
  try {
    const {
      search,
      category,
      machine,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 0,
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { machine: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (machine) {
      query.machine = { $regex: machine, $options: "i" };
    }

    if (status) {
      const statuses = status.split(",");
      query.status = { $in: statuses };
    }

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = page > 0 && limit > 0 ? (page - 1) * limit : 0;
    const limitNum = parseInt(limit) || 0;

    const spareParts = await SparePart.find(query)
      .populate("category", "name description machine")
      .populate("supplier", "name contactPerson email phone")
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await SparePart.countDocuments(query);

    res.status(200).json({
      success: true,
      count: spareParts.length,
      total,
      page: page > 0 ? parseInt(page) : 1,
      limit: limitNum || total,
      data: spareParts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching spare parts",
    });
  }
};

export const getSparePartById = async (req, res) => {
  try {
    const sparePart = await SparePart.findById(req.params.id)
      .populate("category", "name description machine")
      .populate("supplier", "name contactPerson email phone");

    if (!sparePart) {
      return res.status(404).json({
        success: false,
        message: "Spare part not found",
      });
    }

    res.status(200).json({
      success: true,
      data: sparePart,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Spare part not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error fetching spare part",
    });
  }
};

export const updateSparePart = async (req, res) => {
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
      name,
      partNumber,
      sku,
      description,
      category,
      machine,
      supplier,
      quantity,
      minStockLevel,
      maxStockLevel,
      unitPrice,
      reorderLevel,
      status,
    } = req.body;

    let sparePart = await SparePart.findById(req.params.id);

    if (!sparePart) {
      return res.status(404).json({
        success: false,
        message: "Spare part not found",
      });
    }

    if (sku && sku !== sparePart.sku) {
      const existingSku = await SparePart.findOne({ sku });
      if (existingSku) {
        return res.status(400).json({
          success: false,
          message: "Spare part with this SKU already exists",
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (partNumber !== undefined) updateData.partNumber = partNumber;
    if (sku !== undefined) updateData.sku = sku;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (machine !== undefined) updateData.machine = machine;
    if (supplier !== undefined) updateData.supplier = supplier;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (minStockLevel !== undefined) updateData.minStockLevel = minStockLevel;
    if (maxStockLevel !== undefined) updateData.maxStockLevel = maxStockLevel;
    if (unitPrice !== undefined) updateData.unitPrice = unitPrice;
    if (reorderLevel !== undefined) updateData.reorderLevel = reorderLevel;
    if (status !== undefined) updateData.status = status;

    sparePart = await SparePart.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true, context: "query" }
    );

    const populated = await SparePart.findById(sparePart._id)
      .populate("category", "name description machine")
      .populate("supplier", "name contactPerson email phone");

    res.status(200).json({
      success: true,
      message: "Spare part updated successfully",
      data: populated,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Spare part not found",
      });
    }

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

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Spare part with this SKU already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error updating spare part",
    });
  }
};

export const deleteSparePart = async (req, res) => {
  try {
    const sparePart = await SparePart.findById(req.params.id);

    if (!sparePart) {
      return res.status(404).json({
        success: false,
        message: "Spare part not found",
      });
    }

    await SparePart.findByIdAndDelete(req.params.id);

    // create a notification for deletion
    try {
      await Notification.create({
        type: "system",
        severity: "info",
        title: `Spare part deleted: ${sparePart.name}`,
        message: `Spare part ${sparePart.name} (SKU: ${sparePart.sku || 'N/A'}) was deleted.`,
        reference: { modelType: "SparePart", modelId: sparePart._id },
      });
    } catch (nErr) {
      console.error("Failed to create spare part deletion notification:", nErr);
    }

    res.status(200).json({
      success: true,
      message: "Spare part deleted successfully",
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Spare part not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error deleting spare part",
    });
  }
};
