import ToolInventory from "../models/ToolInventory.js";
import { validationResult } from "express-validator";

export const createTool = async (req, res) => {
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
      toolCode,
      description,
      category,
      brand,
      model,
      serialNumber,
      totalQuantity,
      availableQuantity,
      condition,
      location,
      purchaseDate,
      purchasePrice,
      status,
      remarks,
    } = req.body;

    const existingToolCode = await ToolInventory.findOne({ toolCode });
    if (existingToolCode) {
      return res.status(400).json({
        success: false,
        message: "Tool with this tool code already exists",
      });
    }

    if (serialNumber) {
      const existingSerial = await ToolInventory.findOne({ serialNumber });
      if (existingSerial) {
        return res.status(400).json({
          success: false,
          message: "Tool with this serial number already exists",
        });
      }
    }

    const tool = await ToolInventory.create({
      name,
      toolCode,
      description,
      category,
      brand,
      model,
      serialNumber,
      totalQuantity: totalQuantity ?? 1,
      availableQuantity: availableQuantity ?? 1,
      condition: condition || "good",
      location,
      purchaseDate,
      purchasePrice,
      status: status || "available",
      remarks,
    });

    res.status(201).json({
      success: true,
      message: "Tool created successfully",
      data: tool,
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
      const keyPattern = error.keyPattern || {};
      if (keyPattern.toolCode) {
        return res.status(400).json({
          success: false,
          message: "Tool with this tool code already exists",
        });
      }
      if (keyPattern.serialNumber) {
        return res.status(400).json({
          success: false,
          message: "Tool with this serial number already exists",
        });
      }
      return res.status(400).json({
        success: false,
        message: "Duplicate value error",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during tool creation",
    });
  }
};

export const getTools = async (req, res) => {
  try {
    const {
      search,
      category,
      status,
      condition,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 0,
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { toolCode: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { serialNumber: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      query.category = { $regex: category, $options: "i" };
    }

    if (status) {
      const statuses = status.split(",");
      query.status = { $in: statuses };
    }

    if (condition) {
      const conditions = condition.split(",");
      query.condition = { $in: conditions };
    }

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = page > 0 && limit > 0 ? (page - 1) * limit : 0;
    const limitNum = parseInt(limit) || 0;

    const tools = await ToolInventory.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await ToolInventory.countDocuments(query);

    res.status(200).json({
      success: true,
      count: tools.length,
      total,
      page: page > 0 ? parseInt(page) : 1,
      limit: limitNum || total,
      data: tools,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching tools",
    });
  }
};

export const getToolById = async (req, res) => {
  try {
    const tool = await ToolInventory.findById(req.params.id);

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: "Tool not found",
      });
    }

    res.status(200).json({
      success: true,
      data: tool,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Tool not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error fetching tool",
    });
  }
};

export const updateTool = async (req, res) => {
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
      toolCode,
      description,
      category,
      brand,
      model,
      serialNumber,
      totalQuantity,
      availableQuantity,
      condition,
      location,
      purchaseDate,
      purchasePrice,
      status,
      remarks,
    } = req.body;

    let tool = await ToolInventory.findById(req.params.id);

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: "Tool not found",
      });
    }

    if (toolCode && toolCode !== tool.toolCode) {
      const existingToolCode = await ToolInventory.findOne({ toolCode });
      if (existingToolCode) {
        return res.status(400).json({
          success: false,
          message: "Tool with this tool code already exists",
        });
      }
    }

    if (serialNumber && serialNumber !== tool.serialNumber) {
      const existingSerial = await ToolInventory.findOne({ serialNumber });
      if (existingSerial) {
        return res.status(400).json({
          success: false,
          message: "Tool with this serial number already exists",
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (toolCode !== undefined) updateData.toolCode = toolCode;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (brand !== undefined) updateData.brand = brand;
    if (model !== undefined) updateData.model = model;
    if (serialNumber !== undefined) updateData.serialNumber = serialNumber;
    if (totalQuantity !== undefined) updateData.totalQuantity = totalQuantity;
    if (availableQuantity !== undefined) updateData.availableQuantity = availableQuantity;
    if (condition !== undefined) updateData.condition = condition;
    if (location !== undefined) updateData.location = location;
    if (purchaseDate !== undefined) updateData.purchaseDate = purchaseDate;
    if (purchasePrice !== undefined) updateData.purchasePrice = purchasePrice;
    if (status !== undefined) updateData.status = status;
    if (remarks !== undefined) updateData.remarks = remarks;

    tool = await ToolInventory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true, context: "query" }
    );

    res.status(200).json({
      success: true,
      message: "Tool updated successfully",
      data: tool,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Tool not found",
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
      const keyPattern = error.keyPattern || {};
      if (keyPattern.toolCode) {
        return res.status(400).json({
          success: false,
          message: "Tool with this tool code already exists",
        });
      }
      if (keyPattern.serialNumber) {
        return res.status(400).json({
          success: false,
          message: "Tool with this serial number already exists",
        });
      }
      return res.status(400).json({
        success: false,
        message: "Duplicate value error",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error updating tool",
    });
  }
};

export const deleteTool = async (req, res) => {
  try {
    const tool = await ToolInventory.findById(req.params.id);

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: "Tool not found",
      });
    }

    await ToolInventory.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Tool deleted successfully",
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Tool not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error deleting tool",
    });
  }
};
