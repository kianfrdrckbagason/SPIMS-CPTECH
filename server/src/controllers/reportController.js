import ExcelJS from "exceljs";
import SparePart from "../models/SparePart.js";
import Consumable from "../models/Consumable.js";
import Transaction from "../models/Transaction.js";
import BorrowedTool from "../models/BorrowedTool.js";
import Category from "../models/Category.js";
import DailyConsumption from "../models/DailyConsumption.js";

const startOf = (period, year, month, day) => {
  const now = new Date();
  switch (period) {
    case "day":
      return new Date(year ?? now.getFullYear(), month ?? now.getMonth(), day ?? now.getDate(), 0, 0, 0, 0);
    case "week": {
      const d = day ? new Date(year, month, day) : now;
      const dayOfWeek = d.getDay();
      const start = new Date(d);
      start.setDate(d.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "month":
      return new Date(year ?? now.getFullYear(), month ?? now.getMonth(), 1, 0, 0, 0, 0);
    case "year":
      return new Date(year ?? now.getFullYear(), 0, 1, 0, 0, 0, 0);
    default:
      return null;
  }
};

const endOf = (period, year, month, day) => {
  const now = new Date();
  switch (period) {
    case "day": {
      const d = new Date(year ?? now.getFullYear(), month ?? now.getMonth(), day ?? now.getDate());
      d.setHours(23, 59, 59, 999);
      return d;
    }
    case "week": {
      const s = startOf("week", year, month, day);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      e.setHours(23, 59, 59, 999);
      return e;
    }
    case "month": {
      const y = year ?? now.getFullYear();
      const m = month ?? now.getMonth();
      return new Date(y, m + 1, 0, 23, 59, 59, 999);
    }
    case "year": {
      const y = year ?? now.getFullYear();
      return new Date(y, 11, 31, 23, 59, 59, 999);
    }
    default:
      return null;
  }
};

const getDateFilter = (period, year, month, day) => {
  const start = startOf(period, year, month, day);
  const end = endOf(period, year, month, day);
  return { date: { $gte: start, $lte: end } };
};

export const generateTransactionsReport = async (req, res) => {
  try {
    const {
      period = "daily", format = "excel", year, month, day, fromDate, toDate, type } = req.query;

    let filter = {};
    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    } else {
      filter = getDateFilter(period, year ? parseInt(year) : undefined, month ? parseInt(month) - 1 : undefined, day ? parseInt(day) : undefined);
    }
    if (type) filter.type = type;

    const transactions = await Transaction.find(filter)
      .sort({ date: 1 })
      .populate("sparePart", "name sku")
      .populate("consumable", "name sku")
      .populate("tool", "name toolCode")
      .populate("user", "fullName");

    const now2 = new Date();
    const periodLabels = {
      daily: `Daily - ${now2.toLocaleDateString()}`,
      weekly: `Weekly - ${startOf("week").toLocaleDateString()} - ${endOf("week").toLocaleDateString()}`,
      monthly: `Monthly - ${new Date(year ?? now2.getFullYear(), (month ?? now2.getMonth() + 1) - 1).toLocaleString("en-US", { month: "long", year: "numeric" })}`,
      annual: `Annual - ${year ?? now2.getFullYear()}`,
    };
    const periodLabel = fromDate || toDate
      ? `${fromDate || "Start"} to ${toDate || "End"}`
      : (periodLabels[period] || period);

    if (format === "pdf") {
      res.setHeader("Content-Type", "application/json");
      res.status(200).json({
        success: true,
        message: "PDF export is unavailable in this environment, but the report data is ready for download as Excel.",
        data: { periodLabel, transactionsCount: transactions.length },
      });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SPIMS";
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet("Transactions");

    worksheet.columns = [
      { header: "Date", key: "date", width: 18 },
      { header: "Type", key: "type", width: 22 },
      { header: "Item Type", key: "itemType", width: 14 },
      { header: "Item Name", key: "itemName", width: 40 },
      { header: "SKU/Code", key: "sku", width: 18 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "Unit Price", key: "unitPrice", width: 12 },
      { header: "Balance After", key: "balanceAfter", width: 14 },
      { header: "Employee", key: "employeeName", width: 22 },
      { header: "Department", key: "department", width: 18 },
      { header: "Machine", key: "machine", width: 20 },
      { header: "Received By", key: "receivedBy", width: 20 },
      { header: "Released By", key: "releasedBy", width: 20 },
      { header: "User", key: "user", width: 22 },
      { header: "Reference", key: "reference", width: 18 },
      { header: "Remarks", key: "remarks", width: 40 },
    ];
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1976D2" } };
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    transactions.forEach((tx) => {
      worksheet.addRow({
        date: new Date(tx.date).toLocaleString(),
        type: tx.type,
        itemType: tx.itemType,
        itemName: tx.sparePart?.name || tx.consumable?.name || tx.tool?.name || "",
        sku: tx.sparePart?.sku || tx.consumable?.sku || tx.tool?.toolCode || "",
        quantity: tx.quantity,
        unitPrice: tx.unitPrice || 0,
        balanceAfter: tx.balanceAfter ?? "",
        employeeName: tx.employeeName || "",
        department: tx.department || "",
        machine: tx.machine || "",
        receivedBy: tx.receivedBy || "",
        releasedBy: tx.releasedBy || "",
        user: tx.user?.fullName || "",
        reference: tx.reference || "",
        remarks: tx.remarks || "",
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="transactions_${period}_${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("generateTransactionsReport error:", error);
    res.status(500).json({ success: false, message: "Server error generating transactions report" });
  }
};

export const generateStockStatusReport = async (req, res) => {
  try {
    const { status = "all", format = "excel" } = req.query;
    let filter = { status: "active" };

    const parts = await SparePart.find(filter)
      .populate("category", "name")
      .populate("supplier", "name")
      .sort({ name: 1 });

    let result = parts;
    if (status === "low") result = parts.filter(p => p.quantity > 0 && p.quantity <= p.minStockLevel);
    if (status === "out") result = parts.filter(p => p.quantity <= 0);
    if (status === "ok") result = parts.filter(p => p.quantity > p.minStockLevel);

    const statusLabel = { low: "Low Stock Report", out: "Out of Stock Report", ok: "Healthy Stock Report", all: "Inventory Summary Report" }[status];

    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="stock_${status}_${Date.now()}.pdf"`);
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      doc.pipe(res);
      doc.fontSize(18).text(`SPIMS - ${statusLabel}`, { align: "center" }).moveDown(0.5);
      doc.fontSize(11).fillColor("#555").text(`Generated: ${new Date().toLocaleString()}`, { align: "center" }).moveDown(1);
      const headers = ["SKU", "Name", "Category", "Qty", "Min", "Status"];
      const colX = [40, 120, 270, 390, 430, 480];
      const colW = [75, 145, 115, 35, 40, 60];
      let y = 130;
      doc.fillColor("#1976d2").rect(40, y - 12, 515, 22).fill();
      doc.fillColor("#fff").fontSize(10).font("Helvetica-Bold");
      headers.forEach((h, i) => doc.text(h, colX[i] + 4, y - 6, { width: colW[i] }));
      y += 14; doc.font("Helvetica").fillColor("#222");
      result.forEach((p, i) => {
        if (y > 760) { doc.addPage(); y = 60; }
        const zebra = i % 2 === 0 ? "#f7f9fc" : "#ffffff";
        doc.fillColor(zebra).rect(40, y - 10, 515, 18).fill();
        doc.fillColor("#222").fontSize(9);
        const sStatus = p.quantity <= 0 ? "OUT" : p.quantity <= p.minStockLevel ? "LOW" : "OK";
        const sColor = sStatus === "OUT" ? "#d32f2f" : sStatus === "LOW" ? "#f57c00" : "#388e3c";
        doc.text(p.sku, colX[0] + 4, y - 6, { width: colW[0] });
        doc.text(p.name?.toString().slice(0,35), colX[1] + 4, y - 6, { width: colW[1] });
        doc.text(p.category?.name || "", colX[2] + 4, y - 6, { width: colW[2] });
        doc.text(p.quantity?.toString(), colX[3] + 4, y - 6, { width: colW[3] });
        doc.text(p.minStockLevel?.toString(), colX[4] + 4, y - 6, { width: colW[4] });
        doc.fillColor(sColor).text(sStatus, colX[5] + 4, y - 6, { width: colW[5] });
        doc.fillColor("#222");
        y += 16;
      });
      doc.fontSize(10).fillColor("#333").moveDown(1).text(`Total items: ${result.length}`, 40);
      doc.end();
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet(statusLabel.replace(" Report", ""));
    ws.columns = [
      { header: "SKU", key: "sku", width: 18 },
      { header: "Name", key: "name", width: 40 },
      { header: "Category", key: "category", width: 30 },
      { header: "Machine", key: "machine", width: 22 },
      { header: "Quantity", key: "quantity", width: 12 },
      { header: "Min Stock", key: "minStockLevel", width: 12 },
      { header: "Max Stock", key: "maxStockLevel", width: 12 },
      { header: "Unit Price", key: "unitPrice", width: 12 },
      { header: "Supplier", key: "supplier", width: 25 },
      { header: "Status", key: "status", width: 14 },
      { header: "Status Color", key: "stockStatus", width: 14 },
    ];
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1976D2" } };

    result.forEach((p) => {
      const sStatus = p.quantity <= 0 ? "OUT" : p.quantity <= p.minStockLevel ? "LOW" : "OK";
      ws.addRow({
        sku: p.sku, name: p.name, category: p.category?.name || "", machine: p.machine || "", quantity: p.quantity,
        minStockLevel: p.minStockLevel, maxStockLevel: p.maxStockLevel || "", unitPrice: p.unitPrice || 0,
        supplier: p.supplier?.name || "", status: p.status, stockStatus: sStatus,
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="stock_${status}_${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("generateStockStatusReport error:", error);
    res.status(500).json({ success: false, message: "Server error generating stock report" });
  }
};

export const generateBorrowedToolsReport = async (req, res) => {
  try {
    const { status = "all", format = "excel" } = req.query;
    let filter = {};
    if (status !== "all") filter.status = status;

    const borrowed = await BorrowedTool.find(filter)
      .populate("tool", "name toolCode category")
      .populate("issuedBy", "fullName")
      .populate("receivedBy", "fullName")
      .sort({ borrowDate: -1 });

    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="borrowed_tools_${Date.now()}.pdf"`);
      const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
      doc.pipe(res);
      doc.fontSize(18).text("SPIMS - Borrowed Tools Report", { align: "center" }).moveDown(0.5);
      doc.fontSize(11).fillColor("#555").text(`Generated: ${new Date().toLocaleString()}`, { align: "center" }).moveDown(1);
      doc.end();
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Borrowed Tools");
    ws.columns = [
      { header: "Tool", key: "tool", width: 35 },
      { header: "Tool Code", key: "toolCode", width: 16 },
      { header: "Borrower", key: "borrowerName", width: 22 },
      { header: "Department", key: "department", width: 18 },
      { header: "Qty", key: "quantity", width: 8 },
      { header: "Borrow Date", key: "borrowDate", width: 16 },
      { header: "Expected Return", key: "expectedReturnDate", width: 18 },
      { header: "Actual Return", key: "actualReturnDate", width: 18 },
      { header: "Status", key: "status", width: 14 },
      { header: "Condition Borrow", key: "condB", width: 16 },
      { header: "Condition Return", key: "condR", width: 16 },
      { header: "Issued By", key: "issuedBy", width: 22 },
      { header: "Remarks", key: "remarks", width: 35 },
    ];
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1976D2" } };
    borrowed.forEach((b) => ws.addRow({
      tool: b.tool?.name || "", toolCode: b.tool?.toolCode || "",
      borrowerName: b.borrowerName, department: b.department, quantity: b.quantity,
      borrowDate: new Date(b.borrowDate).toLocaleDateString(),
      expectedReturnDate: new Date(b.expectedReturnDate).toLocaleDateString(),
      actualReturnDate: b.actualReturnDate ? new Date(b.actualReturnDate).toLocaleDateString() : "",
      status: b.status, condB: b.toolConditionOnBorrow, condR: b.toolConditionOnReturn || "",
      issuedBy: b.issuedBy?.fullName || "", remarks: b.remarks || "",
    }));
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="borrowed_tools_${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("generateBorrowedToolsReport error:", error);
    res.status(500).json({ success: false, message: "Server error generating tools report" });
  }
};

export const generateConsumablesReport = async (req, res) => {
  try {
    const { year, month, format = "excel" } = req.query;
    const consumables = await Consumable.find({ status: "active" }).sort({ name: 1 });
    const now = new Date();
    const y = year ? parseInt(year) : now.getFullYear();
    const m = month ? parseInt(month) - 1 : now.getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const monthlyUsage = await DailyConsumption.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: "$consumable", totalUsed: { $sum: "$quantityUsed" }, records: { $sum: 1 } } },
    ]);
    const usageMap = {};
    monthlyUsage.forEach(u => { usageMap[u._id.toString()] = { totalUsed: u.totalUsed, records: u.records }; });

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Consumables Report");
    ws.columns = [
      { header: "SKU", key: "sku", width: 16 },
      { header: "Name", key: "name", width: 35 },
      { header: "Unit", key: "unit", width: 10 },
      { header: "Current Qty", key: "qty", width: 12 },
      { header: "Min Stock", key: "min", width: 12 },
      { header: `Monthly Used (${m + 1}/${y})`, key: "monthly", width: 18 },
      { header: "Usage Records", key: "records", width: 14 },
      { header: "Unit Price", key: "price", width: 12 },
      { header: "Status", key: "stockStatus", width: 12 },
    ];
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1976D2" } };
    consumables.forEach(c => {
      const u = usageMap[c._id.toString()] || { totalUsed: 0, records: 0 };
      const s = c.quantity <= 0 ? "OUT" : c.quantity <= c.minStockLevel ? "LOW" : "OK";
      ws.addRow({
        sku: c.sku, name: c.name, unit: c.unit, qty: c.quantity, min: c.minStockLevel,
        monthly: u.totalUsed, records: u.records, price: c.unitPrice || 0, stockStatus: s,
      });
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="consumables_${y}_${m + 1}_${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("generateConsumablesReport error:", error);
    res.status(500).json({ success: false, message: "Server error generating consumables report" });
  }
};

export const getInventorySummaryReportData = async (req, res) => {
  try {
    const [totalParts, totalCats, totalConsumables, totalTools, totalBorrowed, lowStock, outOfStock] = await Promise.all([
      SparePart.countDocuments({ status: "active" }),
      Category.countDocuments({ status: "active" }),
      Consumable.countDocuments({ status: "active" }),
      (await ToolInventory.aggregate([{ $match: { status: { $in: ["available", "borrowed", "maintenance"] } } }, { $group: { _id: null, total: { $sum: "$totalQuantity" } } }]))[0]?.total || 0,
      BorrowedTool.countDocuments({ status: { $in: ["borrowed", "overdue"] } }),
      SparePart.countDocuments({
        status: "active",
        $expr: {
          $and: [{ $gt: ["$quantity", 0] }, { $lte: ["$quantity", "$minStockLevel"] }],
        },
      }),
      SparePart.countDocuments({ status: "active", quantity: 0 }),
    ]);

    const partValue = await SparePart.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: null, total: { $sum: { $multiply: ["$quantity", "$unitPrice"] } } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalSpareParts: totalParts,
        totalCategories: totalCats,
        totalConsumables,
        totalTools,
        totalBorrowedTools: totalBorrowed,
        lowStockItems: lowStock,
        outOfStockItems: outOfStock,
        totalInventoryValue: partValue[0]?.total || 0,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("getInventorySummaryReportData error:", error);
    res.status(500).json({ success: false, message: "Server error fetching summary" });
  }
};
