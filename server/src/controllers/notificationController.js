import Notification from "../models/Notification.js";
import mongoose from "mongoose";

export const getNotifications = async (req, res) => {
  try {
    const { read, type, severity, limit = 50, page = 1, unreadFirst = "true" } = req.query;

    const filter = {};

    if (read !== undefined) {
      if (read === "true" || read === "1") filter.read = true;
      else if (read === "false" || read === "0") filter.read = false;
    }

    if (type) {
      const types = type.split(",");
      filter.type = { $in: types };
    }

    if (severity) {
      const severities = severity.split(",");
      filter.severity = { $in: severities };
    }

    const sort = {};
    if (unreadFirst === "true") {
      sort.read = 1;
    }
    sort.createdAt = -1;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total] = await Promise.all([
      Notification.find(filter).sort(sort).skip(skip).limit(limitNum),
      Notification.countDocuments(filter),
    ]);

    const unreadCount = await Notification.countDocuments({ read: false });

    res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      unreadCount,
    });
  } catch (error) {
    console.error("getNotifications error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching notifications",
    });
  }
};

export const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }
    console.error("getNotificationById error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching notification",
    });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }
    console.error("markAsRead error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating notification",
    });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notification(s) marked as read`,
      data: {
        markedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("markAllAsRead error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating notifications",
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    await Notification.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }
    console.error("deleteNotification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting notification",
    });
  }
};

export const clearReadNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({ read: true });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} read notification(s) cleared`,
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    console.error("clearReadNotifications error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while clearing notifications",
    });
  }
};
