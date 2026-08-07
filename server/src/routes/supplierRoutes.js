import express from "express";
import { body, param, query } from "express-validator";
import mongoose from "mongoose";
import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
} from "../controllers/supplierController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.use(protect);

router.get(
  "/",
  [
    query("search").optional().trim(),
    query("status").optional().trim(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 0 }),
  ],
  getSuppliers
);

router.get(
  "/:id",
  [param("id").custom((val) => mongoose.Types.ObjectId.isValid(val)).withMessage("Invalid Supplier ID format")],
  getSupplierById
);

router.post(
  "/",
  authorize("admin"),
  [
    body("name").trim().notEmpty().withMessage("Supplier name is required").isLength({ min: 2, max: 150 }),
    body("contactPerson").optional().trim().isLength({ max: 100 }),
    body("email").optional().trim().isEmail().withMessage("Please provide a valid email").normalizeEmail(),
    body("phone").optional().trim().isLength({ max: 30 }),
    body("address").optional().trim().isLength({ max: 500 }),
    body("status").optional().isIn(["active", "inactive"]),
  ],
  createSupplier
);

router.put(
  "/:id",
  authorize("admin"),
  [
    param("id").custom((val) => mongoose.Types.ObjectId.isValid(val)).withMessage("Invalid Supplier ID format"),
    body("name").optional().trim().isLength({ min: 2, max: 150 }),
    body("contactPerson").optional().trim().isLength({ max: 100 }),
    body("email").optional().trim().isEmail().withMessage("Please provide a valid email").normalizeEmail(),
    body("phone").optional().trim().isLength({ max: 30 }),
    body("address").optional().trim().isLength({ max: 500 }),
    body("status").optional().isIn(["active", "inactive"]),
  ],
  updateSupplier
);

router.delete(
  "/:id",
  authorize("admin"),
  [param("id").custom((val) => mongoose.Types.ObjectId.isValid(val)).withMessage("Invalid Supplier ID format")],
  deleteSupplier
);

export default router;
