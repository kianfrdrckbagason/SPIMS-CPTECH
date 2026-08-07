import express from "express";
import { param } from "express-validator";
import mongoose from "mongoose";
import {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/", getNotifications);
router.post("/mark-all-read", markAllAsRead);
router.delete("/clear-read", clearReadNotifications);

router.get(
  "/:id",
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid Notification ID format"),
  ],
  getNotificationById
);

router.put(
  "/:id/read",
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid Notification ID format"),
  ],
  markAsRead
);

router.delete(
  "/:id",
  [
    param("id")
      .custom((val) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Invalid Notification ID format"),
  ],
  deleteNotification
);

export default router;
