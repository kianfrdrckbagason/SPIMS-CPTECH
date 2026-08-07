import Category from "../models/Category.js";
import { validationResult } from "express-validator";

export const createCategory = async (req, res) => {
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
    const { name, description, machine, sortOrder, status } = req.body;

    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    const category = await Category.create({
      name,
      description,
      machine,
      sortOrder: sortOrder ?? 0,
      status: status || "active",
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
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
        message: "Category with this name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during category creation",
    });
  }
};

export const getCategories = async (req, res) => {
  try {
    const { search, status, sortBy = "sortOrder", sortOrder = "asc", page = 1, limit = 0 } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { machine: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      const statuses = status.split(",");
      query.status = { $in: statuses };
    }

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = page > 0 && limit > 0 ? (page - 1) * limit : 0;
    const limitNum = parseInt(limit) || 0;

    const categories = await Category.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await Category.countDocuments(query);

    res.status(200).json({
      success: true,
      count: categories.length,
      total,
      page: page > 0 ? parseInt(page) : 1,
      limit: limitNum || total,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error fetching categories",
    });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error fetching category",
    });
  }
};

export const updateCategory = async (req, res) => {
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
    const { name, description, machine, sortOrder, status } = req.body;

    let category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Category with this name already exists",
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (machine !== undefined) updateData.machine = machine;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (status !== undefined) updateData.status = status;

    category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true, context: "query" }
    );

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Category not found",
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
        message: "Category with this name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error updating category",
    });
  }
};

export const archiveCategory = async (req, res) => {
  try {
    let category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category = await Category.findByIdAndUpdate(
      req.params.id,
      { status: "archived" },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Category archived successfully",
      data: category,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error archiving category",
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error deleting category",
    });
  }
};
