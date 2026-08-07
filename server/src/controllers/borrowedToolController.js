import BorrowedTool from "../models/BorrowedTool.js";
import ToolInventory from "../models/ToolInventory.js";
import Transaction from "../models/Transaction.js";
import Notification from "../models/Notification.js";
import { validationResult } from "express-validator";

export const borrowTool = async (req, res) => {
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
      tool,
      borrowerName,
      department,
      quantity,
      borrowDate,
      expectedReturnDate,
      toolConditionOnBorrow,
      remarks,
    } = req.body;

    const toolInventory = await ToolInventory.findById(tool);
    if (!toolInventory) {
      return res.status(404).json({
        success: false,
        message: "Tool not found",
      });
    }

    if (toolInventory.status === "lost" || toolInventory.status === "retired") {
      return res.status(400).json({
        success: false,
        message: `Tool is ${toolInventory.status} and cannot be borrowed`,
      });
    }

    if (toolInventory.availableQuantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient available quantity. Available: ${toolInventory.availableQuantity}, Requested: ${quantity}`,
      });
    }

    toolInventory.availableQuantity -= quantity;
    if (toolInventory.availableQuantity === 0 && toolInventory.status === "available") {
      toolInventory.status = "borrowed";
    }
    await toolInventory.save();

    const borrowedTool = await BorrowedTool.create({
      tool,
      borrowerName,
      department,
      quantity,
      borrowDate: borrowDate || Date.now(),
      expectedReturnDate,
      toolConditionOnBorrow: toolConditionOnBorrow || "good",
      status: "borrowed",
      issuedBy: req.user._id,
      remarks,
    });

    await borrowedTool.populate("tool", "name toolCode");
    await borrowedTool.populate("issuedBy", "fullName");

    await Transaction.create({
      type: "borrowTool",
      itemType: "tool",
      tool,
      quantity,
      date: borrowDate || Date.now(),
      employeeName: borrowerName,
      department,
      releasedBy: req.user.fullName,
      remarks,
      user: req.user._id,
    });

    await Notification.create({
      type: "borrowTool",
      severity: "info",
      title: "Tool Borrowed",
      message: `${borrowerName} (${department}) borrowed ${quantity}x ${toolInventory.name} (${toolInventory.toolCode}). Expected return: ${new Date(expectedReturnDate).toLocaleDateString()}`,
      reference: {
        modelType: "BorrowedTool",
        modelId: borrowedTool._id,
      },
      user: null,
    });

    res.status(201).json({
      success: true,
      message: "Tool borrowed successfully",
      data: borrowedTool,
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
    console.error("borrowTool error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while borrowing tool",
    });
  }
};

export const returnTool = async (req, res) => {
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

  const session = await BorrowedTool.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { actualReturnDate, toolConditionOnReturn, receivedBy, remarks } = req.body;

    const borrowedTool = await BorrowedTool.findById(id).session(session);
    if (!borrowedTool) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Borrowed tool record not found",
      });
    }

    if (borrowedTool.status === "returned") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Tool has already been returned",
      });
    }

    const toolInventory = await ToolInventory.findById(borrowedTool.tool).session(session);
    if (!toolInventory) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Tool inventory not found",
      });
    }

    const isDamaged = toolConditionOnReturn === "damaged";
    const isLost = toolConditionOnReturn === "lost";

    let newStatus = "returned";
    if (isDamaged) newStatus = "damaged";
    if (isLost) newStatus = "lost";

    borrowedTool.actualReturnDate = actualReturnDate || Date.now();
    borrowedTool.toolConditionOnReturn = toolConditionOnReturn;
    borrowedTool.status = newStatus;
    borrowedTool.receivedBy = receivedBy || req.user._id;
    if (remarks) {
      borrowedTool.remarks = remarks;
    }
    await borrowedTool.save({ session });

    if (!isLost) {
      toolInventory.availableQuantity += borrowedTool.quantity;
    }

    if (isDamaged) {
      toolInventory.status = "damaged";
    } else if (isLost) {
      toolInventory.status = "lost";
      toolInventory.totalQuantity = Math.max(0, toolInventory.totalQuantity - borrowedTool.quantity);
    } else if (toolInventory.status === "borrowed" && toolInventory.availableQuantity > 0) {
      toolInventory.status = "available";
    } else if (toolInventory.status === "maintenance") {
    }

    await toolInventory.save({ session });

    await Transaction.create(
      [
        {
          type: "returnTool",
          itemType: "tool",
          tool: toolInventory._id,
          quantity: borrowedTool.quantity,
          date: actualReturnDate || Date.now(),
          employeeName: borrowedTool.borrowerName,
          department: borrowedTool.department,
          receivedBy: req.user.fullName,
          remarks: `Condition on return: ${toolConditionOnReturn}${remarks ? ` - ${remarks}` : ""}`,
          user: req.user._id,
        },
      ],
      { session }
    );

    if (isDamaged || isLost) {
      const notifSeverity = isLost ? "critical" : "warning";
      const notifType = isLost ? "system" : "system";
      await Notification.create(
        [
          {
            type: notifType,
            severity: notifSeverity,
            title: isLost ? "Tool Reported Lost" : "Tool Reported Damaged",
            message: `${toolInventory.name} (${toolInventory.toolCode}) was reported ${isLost ? "lost" : "damaged"} upon return by ${borrowedTool.borrowerName}. Quantity: ${borrowedTool.quantity}`,
            reference: {
              modelType: "BorrowedTool",
              modelId: borrowedTool._id,
            },
            user: null,
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    await borrowedTool.populate("tool", "name toolCode");
    await borrowedTool.populate("issuedBy", "fullName");
    await borrowedTool.populate("receivedBy", "fullName");

    res.status(200).json({
      success: true,
      message: `Tool ${isLost ? "marked as lost" : isDamaged ? "marked as damaged" : "returned"} successfully`,
      data: borrowedTool,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
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
    console.error("returnTool error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while processing tool return",
    });
  }
};

export const markOverdue = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTools = await BorrowedTool.find({
      status: { $in: ["borrowed"] },
      expectedReturnDate: { $lt: today },
    }).populate("tool", "name toolCode");

    const updatedIds = [];
    const notifications = [];

    for (const bt of overdueTools) {
      if (bt.status !== "overdue") {
        bt.status = "overdue";
        await bt.save();
        updatedIds.push(bt._id);

        const now = new Date();
        const expected = new Date(bt.expectedReturnDate);
        expected.setHours(23, 59, 59, 999);
        const diffMs = now - expected;
        const daysOverdue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        notifications.push({
          type: "overdueTool",
          severity: "critical",
          title: "Tool Overdue",
          message: `${bt.borrowerName} (${bt.department}) has an overdue tool: ${bt.tool?.name || "Unknown"} (${bt.tool?.toolCode || "N/A"}). ${daysOverdue} day(s) overdue. Quantity: ${bt.quantity}`,
          reference: {
            modelType: "BorrowedTool",
            modelId: bt._id,
          },
          user: null,
        });
      }
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.status(200).json({
      success: true,
      message: `Overdue check completed. Updated ${updatedIds.length} record(s) to overdue status.`,
      data: {
        updatedCount: updatedIds.length,
        updatedIds,
        totalOverdueFound: overdueTools.length,
      },
    });
  } catch (error) {
    console.error("markOverdue error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while checking overdue tools",
    });
  }
};

export const getBorrowedTools = async (req, res) => {
  try {
    const {
      status,
      borrower,
      department,
      tool,
      overdueOnly,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
      sort = "-createdAt",
    } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (borrower) {
      filter.borrowerName = { $regex: borrower, $options: "i" };
    }

    if (department) {
      filter.department = { $regex: department, $options: "i" };
    }

    if (tool) {
      filter.tool = tool;
    }

    if (overdueOnly === "true") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filter.expectedReturnDate = { $lt: today };
      filter.status = { $in: ["borrowed", "overdue"] };
    }

    if (fromDate || toDate) {
      filter.borrowDate = {};
      if (fromDate) {
        filter.borrowDate.$gte = new Date(fromDate);
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        filter.borrowDate.$lte = end;
      }
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [borrowedTools, total] = await Promise.all([
      BorrowedTool.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate("tool", "name toolCode status availableQuantity totalQuantity")
        .populate("issuedBy", "fullName email")
        .populate("receivedBy", "fullName email"),
      BorrowedTool.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: borrowedTools,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("getBorrowedTools error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching borrowed tools",
    });
  }
};

export const getBorrowedToolById = async (req, res) => {
  try {
    const { id } = req.params;

    const borrowedTool = await BorrowedTool.findById(id)
      .populate("tool", "name toolCode category brand model serialNumber status availableQuantity totalQuantity condition location")
      .populate("issuedBy", "fullName email role")
      .populate("receivedBy", "fullName email role");

    if (!borrowedTool) {
      return res.status(404).json({
        success: false,
        message: "Borrowed tool record not found",
      });
    }

    res.status(200).json({
      success: true,
      data: borrowedTool,
    });
  } catch (error) {
    console.error("getBorrowedToolById error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching borrowed tool",
    });
  }
};

export const deleteBorrowedTool = async (req, res) => {
  try {
    const { id } = req.params;

    const borrowedTool = await BorrowedTool.findById(id);
    if (!borrowedTool) {
      return res.status(404).json({
        success: false,
        message: "Borrowed tool record not found",
      });
    }

    if (borrowedTool.status !== "returned" && borrowedTool.status !== "lost" && borrowedTool.status !== "damaged") {
      return res.status(400).json({
        success: false,
        message: "Only returned, lost, or damaged borrowed tool records can be deleted",
      });
    }

    const { remarks } = req.body;
    if (remarks) {
      borrowedTool.remarks = borrowedTool.remarks
        ? `${borrowedTool.remarks}\n[DELETED] ${remarks}`
        : `[DELETED] ${remarks}`;
      await borrowedTool.save();
    }

    await BorrowedTool.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Borrowed tool record deleted successfully",
    });
  } catch (error) {
    console.error("deleteBorrowedTool error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting borrowed tool record",
    });
  }
};
