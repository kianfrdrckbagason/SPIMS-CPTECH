import Consumable from "../models/Consumable.js";
import { validationResult } from "express-validator";

export const createConsumable = async (req, res) => {
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
    const { name, unit, quantity, status, movementClassification } = req.body;

    const consumable = await Consumable.create({
      name,
      unit,
      quantity: quantity ?? 0,
      status: status || "active",
      movementClassification: movementClassification || "medium",
    });

    res.status(201).json({
      success: true,
      message: "Consumable created successfully",
      data: consumable,
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

    res.status(500).json({
      success: false,
      message: "Server error during consumable creation",
    });
  }
};

export const getConsumables = async (req, res) => {
  try {
    const {
      search,
      unit,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 0,
    } = req.query;

    const query = {};

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (unit) {
      query.unit = { $regex: unit, $options: "i" };
    }

    if (status) {
      const statuses = status.split(",");
      query.status = { $in: statuses };
    }

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = page > 0 && limit > 0 ? (page - 1) * limit : 0;
    const limitNum = parseInt(limit) || 0;

    const consumables = await Consumable.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await Consumable.countDocuments(query);

    res.status(200).json({
      success: true,
      count: consumables.length,
      total,
      page: page > 0 ? parseInt(page) : 1,
      limit: limitNum || total,
      data: consumables,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching consumables",
    });
  }
};

export const getConsumableById = async (req, res) => {
  try {
    const consumable = await Consumable.findById(req.params.id);

    if (!consumable) {
      return res.status(404).json({
        success: false,
        message: "Consumable not found",
      });
    }

    res.status(200).json({
      success: true,
      data: consumable,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Consumable not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error fetching consumable",
    });
  }
};

export const updateConsumable = async (req, res) => {
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
    const { name, unit, quantity, status, movementClassification } = req.body;

    let consumable = await Consumable.findById(req.params.id);

    if (!consumable) {
      return res.status(404).json({
        success: false,
        message: "Consumable not found",
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (unit !== undefined) updateData.unit = unit;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (status !== undefined) updateData.status = status;
    if (movementClassification !== undefined) updateData.movementClassification = movementClassification;

    consumable = await Consumable.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true, context: "query" }
    );

    res.status(200).json({
      success: true,
      message: "Consumable updated successfully",
      data: consumable,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Consumable not found",
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

    res.status(500).json({
      success: false,
      message: "Server error updating consumable",
    });
  }
};

export const deleteConsumable = async (req, res) => {
  try {
    const consumable = await Consumable.findById(req.params.id);

    if (!consumable) {
      return res.status(404).json({
        success: false,
        message: "Consumable not found",
      });
    }

    await Consumable.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Consumable deleted successfully",
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Consumable not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error deleting consumable",
    });
  }
};
