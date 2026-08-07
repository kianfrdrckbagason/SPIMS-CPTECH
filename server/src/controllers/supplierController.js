import Supplier from "../models/Supplier.js";
import { validationResult } from "express-validator";

export const createSupplier = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({ field: err.path, message: err.msg })),
    });
  }
  try {
    const { name, contactPerson, email, phone, address, status } = req.body;
    const existing = await Supplier.findOne({ name });
    if (existing) {
      return res.status(400).json({ success: false, message: "Supplier with this name already exists" });
    }
    const supplier = await Supplier.create({
      name, contactPerson, email, phone, address, status: status || "active",
    });
    res.status(201).json({ success: true, message: "Supplier created successfully", data: supplier });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: "Duplicate supplier error" });
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({ field: err.path, message: err.message }));
      return res.status(400).json({ success: false, message: "Validation failed", errors });
    }
    res.status(500).json({ success: false, message: "Server error during supplier creation" });
  }
};

export const getSuppliers = async (req, res) => {
  try {
    const { search, status, sortBy = "createdAt", sortOrder = "desc", page = 1, limit = 0 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }
    if (status) query.status = { $in: status.split(",") };
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;
    const skip = page > 0 && limit > 0 ? (page - 1) * limit : 0;
    const limitNum = parseInt(limit) || 0;
    const suppliers = await Supplier.find(query).sort(sort).skip(skip).limit(limitNum);
    const total = await Supplier.countDocuments(query);
    res.status(200).json({ success: true, count: suppliers.length, total, page: page > 0 ? parseInt(page) : 1, limit: limitNum || total, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error fetching suppliers" });
  }
};

export const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found" });
    res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ success: false, message: "Supplier not found" });
    res.status(500).json({ success: false, message: "Server error fetching supplier" });
  }
};

export const updateSupplier = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array().map((err) => ({ field: err.path, message: err.msg })) });
  }
  try {
    let supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found" });
    const { name, contactPerson, email, phone, address, status } = req.body;
    if (name && name !== supplier.name) {
      const existing = await Supplier.findOne({ name });
      if (existing) return res.status(400).json({ success: false, message: "Supplier with this name already exists" });
    }
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (status !== undefined) updateData.status = status;
    supplier = await Supplier.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true, context: "query" });
    res.status(200).json({ success: true, message: "Supplier updated successfully", data: supplier });
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ success: false, message: "Supplier not found" });
    if (error.code === 11000) return res.status(400).json({ success: false, message: "Duplicate supplier error" });
    res.status(500).json({ success: false, message: "Server error updating supplier" });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found" });
    await Supplier.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Supplier deleted successfully" });
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ success: false, message: "Supplier not found" });
    res.status(500).json({ success: false, message: "Server error deleting supplier" });
  }
};
