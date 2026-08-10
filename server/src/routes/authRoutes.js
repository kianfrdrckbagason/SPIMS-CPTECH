import express from "express";
import { body } from "express-validator";
import {
  register,
  login,
  logout,
  getMe,
  changePassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.post("/register", register);

router.post(
  "/login",
  [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  login
);

router.post("/logout", logout);

router.get("/me", protect, getMe);

router.put("/change-password", protect, changePassword);

router.get("/admin-only", protect, authorize("admin"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Admin access granted",
    user: {
      id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

router.get("/staff-only", protect, authorize("admin", "staff"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Staff access granted",
    user: {
      id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

export default router;
