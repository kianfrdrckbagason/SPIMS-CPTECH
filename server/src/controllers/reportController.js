import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
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

// =============================================================================
// TRANSACTIONS REPORT  (PDF + Excel)
// 8 columns — no SKU: Date&Time | Type | Item | Qty | Bal.After |
//                     Employee/Dept | Machine | Remarks
// + Signatories section at the bottom
// =============================================================================
export const generateTransactionsReport = async (req, res) => {
  try {
    const {
      format = "excel",
      startDate, endDate,   // sent by TransactionsPage
      fromDate,  toDate,    // legacy aliases
      type,
      itemType,
    } = req.query;

    const resolvedFrom = startDate || fromDate || null;
    const resolvedTo   = endDate   || toDate   || null;

    // ── Filter ────────────────────────────────────────────────────────────────
    const filter = {};
    if (resolvedFrom || resolvedTo) {
      filter.date = {};
      if (resolvedFrom) filter.date.$gte = new Date(resolvedFrom);
      if (resolvedTo) {
        const end = new Date(resolvedTo);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }
    if (type) {
      const types = type.split(",").map((t) => t.trim()).filter(Boolean);
      filter.type = types.length === 1 ? types[0] : { $in: types };
    }
    if (itemType) {
      const itemTypes = itemType.split(",").map((t) => t.trim()).filter(Boolean);
      filter.itemType = itemTypes.length === 1 ? itemTypes[0] : { $in: itemTypes };
    }

    // ── Fetch — newest first ──────────────────────────────────────────────────
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1, date: -1 })
      .populate("sparePart", "name sku")
      .populate("consumable", "name sku unit")
      .populate("tool", "name toolCode")
      .populate("user", "fullName email");

    // ── Shared helpers ────────────────────────────────────────────────────────
    const fmtDateLabel = (d) =>
      d ? new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "";
    const periodLabel =
      resolvedFrom || resolvedTo
        ? `${fmtDateLabel(resolvedFrom) || "All"} – ${fmtDateLabel(resolvedTo) || "All"}`
        : "All Transactions";

    const TYPE_LABELS = {
      stockIn:              "Stock In",
      stockOut:             "Stock Out",
      adjustment:           "Adjustment",
      borrowTool:           "Borrow Tool",
      returnTool:           "Return Tool",
      consumableRelease:    "Consumable Release",
      consumableStockIn:    "Consumable Stock In",
      consumableAdjustment: "Consumable Adjustment",
    };

    // Build the 8-column display row (no SKU)
    const buildRow = (tx) => {
      const item    = tx.sparePart?.name || tx.consumable?.name || tx.tool?.name || "";
      const emp     = [tx.employeeName, tx.department].filter(Boolean).join(" / ");
      const dateStr = tx.createdAt
        ? new Date(tx.createdAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
        : new Date(tx.date).toLocaleDateString("en-PH");
      return {
        date:     dateStr,
        type:     TYPE_LABELS[tx.type] || tx.type || "",
        item,
        qty:      String(tx.quantity ?? ""),
        balance:  tx.balanceAfter != null ? String(tx.balanceAfter) : "",
        employee: emp,
        machine:  tx.machine || "",
        remarks:  tx.remarks || tx.adjustmentReason || "",
      };
    };

    // =========================================================================
    // PDF
    // =========================================================================
    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="transactions_${Date.now()}.pdf"`);

      // Landscape A4: 841.89 × 595.28 pt
      const MARGIN   = 36;
      const PAGE_W   = 841.89;
      const PAGE_H   = 595.28;
      const USABLE_W = PAGE_W - MARGIN * 2;   // 769.89 pt

      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margin: MARGIN,
        autoFirstPage: true,
        bufferPages: false,
      });
      doc.pipe(res);

      // ── Column definitions (widths sum to 770 = USABLE_W) ─────────────────
      const COLS = [
        { label: "Date & Time",     key: "date",     w: 112, align: "left"  },
        { label: "Type",            key: "type",     w:  92, align: "left"  },
        { label: "Item",            key: "item",     w: 168, align: "left"  },
        { label: "Qty",             key: "qty",      w:  32, align: "right" },
        { label: "Bal. After",      key: "balance",  w:  48, align: "right" },
        { label: "Employee / Dept", key: "employee", w: 128, align: "left"  },
        { label: "Machine",         key: "machine",  w:  88, align: "left"  },
        { label: "Remarks",         key: "remarks",  w: 102, align: "left"  },
        // 112+92+168+32+48+128+88+102 = 770
      ];

      const FONT_SZ  = 7.5;   // data rows
      const HEAD_SZ  = 7.5;   // header row
      const LINE_H   = FONT_SZ + 2.5;   // line-height inside a cell
      const PAD_X    = 3;                // horizontal padding
      const PAD_Y    = 3;                // vertical padding
      const HEAD_H   = LINE_H + PAD_Y * 2 + 2;   // ≈ 16 pt

      // ── Estimate rendered row height for a data row ───────────────────────
      // We approximate line-count by measuring chars-per-line for each column.
      const estimateLines = (text, colW) => {
        if (!text) return 1;
        const innerW      = colW - PAD_X * 2;
        // Average char width at FONT_SZ ≈ FONT_SZ * 0.50 pt
        const charsPerLine = Math.max(1, Math.floor(innerW / (FONT_SZ * 0.50)));
        const words = String(text).split(" ");
        let lines = 1;
        let used  = 0;
        for (const w of words) {
          if (used > 0 && used + 1 + w.length > charsPerLine) {
            lines++;
            used = w.length;
          } else {
            used += (used ? 1 : 0) + w.length;
          }
        }
        return lines;
      };

      const calcRowH = (rowData) => {
        const maxLines = Math.max(...COLS.map((c) => estimateLines(rowData[c.key], c.w)));
        return Math.max(HEAD_H, maxLines * LINE_H + PAD_Y * 2);
      };

      // ── Draw header band ──────────────────────────────────────────────────
      const drawHeader = (y) => {
        // Background rect — save/restore keeps text cursor unaffected
        doc.save().rect(MARGIN, y, USABLE_W, HEAD_H).fill("#1565c0").restore();
        doc.font("Helvetica-Bold").fontSize(HEAD_SZ).fillColor("#ffffff");
        let cx = MARGIN;
        COLS.forEach((col) => {
          doc.text(col.label, cx + PAD_X, y + PAD_Y, {
            width:     col.w - PAD_X * 2,
            align:     col.align,
            lineBreak: false,
          });
          cx += col.w;
        });
      };

      // ── Draw one data row ─────────────────────────────────────────────────
      const drawDataRow = (rowData, y, rh, shade) => {
        if (shade) {
          doc.save().rect(MARGIN, y, USABLE_W, rh).fill("#f4f7fb").restore();
        }
        // Light horizontal rule at bottom of row
        doc.save()
          .moveTo(MARGIN, y + rh)
          .lineTo(MARGIN + USABLE_W, y + rh)
          .strokeColor("#e0e0e0").lineWidth(0.3).stroke()
          .restore();

        doc.font("Helvetica").fontSize(FONT_SZ).fillColor("#111111");
        let cx = MARGIN;
        COLS.forEach((col) => {
          const val = String(rowData[col.key] ?? "");
          doc.text(val, cx + PAD_X, y + PAD_Y, {
            width:     col.w - PAD_X * 2,
            height:    rh - PAD_Y * 2,
            align:     col.align,
            lineBreak: true,   // wrap within the column width
          });
          cx += col.w;
        });
      };

      // ── Draw signatories ──────────────────────────────────────────────────
      const SIG_LABELS  = ["Prepared by:", "Reviewed by:", "Approved by:"];
      const SIG_BLOCK_H = 70;   // space needed for sig section

      const drawSignatories = (startY) => {
        const third = USABLE_W / 3;
        SIG_LABELS.forEach((lbl, i) => {
          const lx = MARGIN + i * third;
          // Label
          doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#1a1a1a")
            .text(lbl, lx, startY, { width: third - 10, align: "left", lineBreak: false });
          // Signature line (40 pt below label)
          const lineY = startY + 40;
          doc.save()
            .moveTo(lx, lineY)
            .lineTo(lx + third - 20, lineY)
            .strokeColor("#444444").lineWidth(0.6).stroke()
            .restore();
          // "Name / Position" sub-label
          doc.font("Helvetica").fontSize(7.5).fillColor("#666666")
            .text("Name / Position", lx, lineY + 4, {
              width: third - 10, align: "left", lineBreak: false,
            });
        });
      };

      // ── Title block ───────────────────────────────────────────────────────
      doc.fontSize(13).font("Helvetica-Bold").fillColor("#1a1a1a")
        .text("SPIMS – CPTECH  |  TRANSACTION HISTORY", MARGIN, MARGIN, {
          align: "center", width: USABLE_W,
        });
      doc.fontSize(8).font("Helvetica").fillColor("#555555")
        .text(
          `Period: ${periodLabel}   |   Records: ${transactions.length}   |   Generated: ${new Date().toLocaleString("en-PH")}`,
          MARGIN, MARGIN + 18, { align: "center", width: USABLE_W }
        );

      // ── Table ─────────────────────────────────────────────────────────────
      let y = MARGIN + 42;
      drawHeader(y);
      y += HEAD_H;

      transactions.forEach((tx, i) => {
        const rowData = buildRow(tx);
        const rh      = calcRowH(rowData);

        // Need room for this row + sig block on last row
        const isLast = i === transactions.length - 1;
        const needed  = rh + (isLast ? SIG_BLOCK_H + 20 : 0);

        if (y + needed > PAGE_H - MARGIN) {
          doc.addPage({ size: "A4", layout: "landscape", margin: MARGIN });
          y = MARGIN;
          drawHeader(y);
          y += HEAD_H;
        }

        drawDataRow(rowData, y, rh, i % 2 === 0);
        y += rh;
      });

      // ── Record count line ─────────────────────────────────────────────────
      y += 4;
      doc.fontSize(7.5).font("Helvetica").fillColor("#888888")
        .text(
          `Total: ${transactions.length} transaction(s)`,
          MARGIN, y, { width: USABLE_W, align: "right" }
        );
      y += 14;

      // ── Signatories ───────────────────────────────────────────────────────
      if (y + SIG_BLOCK_H > PAGE_H - MARGIN) {
        doc.addPage({ size: "A4", layout: "landscape", margin: MARGIN });
        y = MARGIN + 20;
      }
      drawSignatories(y + 10);

      doc.end();
      return;
    }

    // =========================================================================
    // Excel
    // =========================================================================
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SPIMS-CPTECH";
    workbook.created = new Date();
    const ws = workbook.addWorksheet("Transactions");

    // ── 8 columns, no SKU ─────────────────────────────────────────────────────
    ws.columns = [
      { header: "Date & Time",     key: "date",     width: 22 },
      { header: "Type",            key: "type",     width: 22 },
      { header: "Item Name",       key: "item",     width: 38 },
      { header: "Qty",             key: "qty",      width:  8 },
      { header: "Balance After",   key: "balance",  width: 14 },
      { header: "Employee / Dept", key: "employee", width: 32 },
      { header: "Machine",         key: "machine",  width: 22 },
      { header: "Remarks",         key: "remarks",  width: 38 },
    ];

    // Columns where text should wrap
    const WRAP_KEYS = new Set(["item", "employee", "remarks"]);

    // ── Header row ────────────────────────────────────────────────────────────
    const hdr = ws.getRow(1);
    hdr.font      = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    hdr.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1565C0" } };
    hdr.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    hdr.height    = 22;

    // Apply border to header cells
    hdr.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        bottom: { style: "medium", color: { argb: "FF0D47A1" } },
      };
    });

    // ── Data rows ─────────────────────────────────────────────────────────────
    transactions.forEach((tx, i) => {
      const d   = buildRow(tx);
      const row = ws.addRow({
        date:     d.date,
        type:     d.type,
        item:     d.item,
        qty:      d.qty     !== "" ? Number(d.qty)     : "",
        balance:  d.balance !== "" ? Number(d.balance) : "",
        employee: d.employee,
        machine:  d.machine,
        remarks:  d.remarks,
      });

      row.height = 15; // base; Excel expands automatically when wrapText fires

      const fillArgb = i % 2 === 0 ? "FFF4F7FB" : "FFFFFFFF";
      row.eachCell({ includeEmpty: true }, (cell) => {
        const colKey = ws.getColumn(cell.col).key;
        cell.fill    = { type: "pattern", pattern: "solid", fgColor: { argb: fillArgb } };
        cell.border  = {
          top:    { style: "thin", color: { argb: "FFE0E0E0" } },
          bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
          left:   { style: "thin", color: { argb: "FFE8E8E8" } },
          right:  { style: "thin", color: { argb: "FFE8E8E8" } },
        };
        cell.alignment = {
          vertical:   "top",
          horizontal: (colKey === "qty" || colKey === "balance") ? "right" : "left",
          wrapText:   WRAP_KEYS.has(colKey),
        };
      });
    });

    // ── Signatories section ───────────────────────────────────────────────────
    ws.addRow([]);   // blank spacer
    ws.addRow([]);

    // "Prepared by / Reviewed by / Approved by" labels
    // Place in columns A, D, G  (col indices 1, 4, 7)
    const lblRow = ws.addRow([]);
    lblRow.height = 14;
    const lblCells = [
      { col: 1, text: "Prepared by:" },
      { col: 4, text: "Reviewed by:" },
      { col: 7, text: "Approved by:" },
    ];
    lblCells.forEach(({ col, text }) => {
      const cell    = lblRow.getCell(col);
      cell.value    = text;
      cell.font     = { bold: true, size: 10 };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });

    // Blank signature-space rows (3 rows ≈ 45 pt for handwriting)
    ws.addRow([]).height = 15;
    ws.addRow([]).height = 15;
    ws.addRow([]).height = 15;

    // Signature lines (underscores)
    const lineRow = ws.addRow([]);
    lineRow.height = 14;
    const LINE = "_".repeat(30);
    [
      { col: 1, text: LINE },
      { col: 4, text: LINE },
      { col: 7, text: LINE },
    ].forEach(({ col, text }) => {
      const cell   = lineRow.getCell(col);
      cell.value   = text;
      cell.font    = { color: { argb: "FF888888" } };
    });

    // "Name / Position" sub-labels
    const nameRow = ws.addRow([]);
    nameRow.height = 12;
    [
      { col: 1, text: "Name / Position" },
      { col: 4, text: "Name / Position" },
      { col: 7, text: "Name / Position" },
    ].forEach(({ col, text }) => {
      const cell   = nameRow.getCell(col);
      cell.value   = text;
      cell.font    = { italic: true, color: { argb: "FF666666" }, size: 8.5 };
      cell.alignment = { vertical: "top", horizontal: "left" };
    });

    // ── Freeze header row ─────────────────────────────────────────────────────
    ws.views = [{ state: "frozen", ySplit: 1 }];

    // ── Respond ───────────────────────────────────────────────────────────────
    const safePeriod = (resolvedFrom || resolvedTo)
      ? `${(resolvedFrom || "").replace(/-/g, "") || "start"}-${(resolvedTo || "").replace(/-/g, "") || "end"}`
      : "all";

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="transactions_${safePeriod}_${Date.now()}.xlsx"`);
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

export const generateMonthlyInventoryReport = async (req, res) => {
  try {
    const { month, category } = req.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: "A valid month in YYYY-MM format is required",
      });
    }

    const [year, monthNum] = month.split("-").map(Number);
    const monthStart = new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, monthNum, 0, 23, 59, 59, 999);

    const stockInAgg = await Transaction.aggregate([
      {
        $match: {
          itemType: "sparePart",
          date: { $gte: monthStart, $lte: monthEnd },
          $or: [
            { type: "stockIn" },
            { type: "adjustment", adjustmentType: "increase" },
          ],
        },
      },
      { $group: { _id: "$sparePart", total: { $sum: "$quantity" } } },
    ]);

    const stockOutAgg = await Transaction.aggregate([
      {
        $match: {
          itemType: "sparePart",
          date: { $gte: monthStart, $lte: monthEnd },
          $or: [
            { type: "stockOut" },
            { type: "adjustment", adjustmentType: "decrease" },
          ],
        },
      },
      { $group: { _id: "$sparePart", total: { $sum: "$quantity" } } },
    ]);

    const netAfterAgg = await Transaction.aggregate([
      {
        $match: {
          itemType: "sparePart",
          date: { $gt: monthEnd },
        },
      },
      {
        $group: {
          _id: "$sparePart",
          netIn: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$type", "stockIn"] },
                    { $and: [{ $eq: ["$type", "adjustment"] }, { $eq: ["$adjustmentType", "increase"] }] },
                  ],
                },
                "$quantity", 0,
              ],
            },
          },
          netOut: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$type", "stockOut"] },
                    { $and: [{ $eq: ["$type", "adjustment"] }, { $eq: ["$adjustmentType", "decrease"] }] },
                  ],
                },
                "$quantity", 0,
              ],
            },
          },
        },
      },
    ]);

    const stockInMap  = {};
    const stockOutMap = {};
    const netAfterMap = {};
    stockInAgg.forEach((r)  => { if (r._id) stockInMap[r._id.toString()]  = r.total; });
    stockOutAgg.forEach((r) => { if (r._id) stockOutMap[r._id.toString()] = r.total; });
    netAfterAgg.forEach((r) => { if (r._id) netAfterMap[r._id.toString()] = r.netIn - r.netOut; });

    const partQuery = { status: { $ne: "archived" } };
    if (category) partQuery.category = category;

    const activePartIds = [...new Set([...Object.keys(stockInMap), ...Object.keys(stockOutMap)])];

    if (activePartIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          month,
          monthLabel: new Date(year, monthNum - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          categories: [],
          generatedAt: new Date(),
        },
      });
    }

    partQuery._id = { $in: activePartIds };

    const parts = await SparePart.find(partQuery)
      .populate("category", "name")
      .sort({ name: 1 });

    const categoryMap = new Map();

    parts.forEach((part) => {
      const categoryName  = part.category?.name || "Uncategorized";
      const id            = part._id.toString();
      const monthStockIn  = stockInMap[id]  || 0;
      const monthStockOut = stockOutMap[id] || 0;
      const netAfter      = netAfterMap[id] || 0;
      const ending        = Math.max(0, Number(part.quantity || 0) - netAfter);
      const beginning     = Math.max(0, ending - monthStockIn + monthStockOut);

      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, { category: categoryName, items: [] });
      }
      categoryMap.get(categoryName).items.push({
        part: part.name, unit: "pcs", beginning, stockIn: monthStockIn, stockOut: monthStockOut, ending,
      });
    });

    res.status(200).json({
      success: true,
      data: {
        month,
        monthLabel: new Date(year, monthNum - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        categories: Array.from(categoryMap.values()),
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("generateMonthlyInventoryReport error:", error);
    res.status(500).json({ success: false, message: "Server error generating monthly inventory report" });
  }
};

export const getMonthlyTransactionsReport = async (req, res) => {
  try {
    const { month } = req.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: "A valid month in YYYY-MM format is required" });
    }

    const [year, monthNum] = month.split("-").map(Number);
    const monthStart = new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
    const monthEnd   = new Date(year, monthNum, 0, 23, 59, 59, 999);

    const transactions = await Transaction.find({ date: { $gte: monthStart, $lte: monthEnd } })
      .sort({ date: 1 })
      .populate({ path: "sparePart", select: "name sku category", populate: { path: "category", select: "name" } })
      .populate("consumable", "name unit")
      .populate("tool", "name toolCode")
      .lean();

    const TYPE_LABEL = {
      stockIn: "STOCK IN", stockOut: "STOCK OUT", adjustment: "ADJUSTMENT",
      borrowTool: "BORROW", returnTool: "RETURN",
      consumableRelease: "RELEASE", consumableStockIn: "STOCK IN", consumableAdjustment: "ADJUSTMENT",
    };

    const rows = transactions.map((tx) => {
      let itemName = "";
      let category = "";
      if (tx.itemType === "sparePart" && tx.sparePart) {
        itemName = tx.sparePart.name || "";
        category = tx.sparePart.category?.name || "Uncategorized";
      } else if (tx.itemType === "consumable" && tx.consumable) {
        itemName = tx.consumable.name || "";
        category = "Consumables";
      } else if (tx.itemType === "tool" && tx.tool) {
        itemName = tx.tool.name || "";
        category = "Tools";
      }
      return {
        date: tx.date, category, itemType: tx.itemType, item: itemName,
        type: TYPE_LABEL[tx.type] || tx.type, quantity: tx.quantity,
        balanceAfter: tx.balanceAfter ?? null,
        employeeName: tx.employeeName || tx.receivedBy || tx.releasedBy || "",
        department: tx.department || "", machine: tx.machine || "", remarks: tx.remarks || "",
      };
    });

    res.status(200).json({
      success: true,
      data: {
        month,
        monthLabel: new Date(year, monthNum - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        rows, total: rows.length, generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("getMonthlyTransactionsReport error:", error);
    res.status(500).json({ success: false, message: "Server error generating monthly transactions report" });
  }
};

export const getInventorySummaryReportData = async (req, res) => {
  try {
    const [totalParts, totalCats, totalConsumables, totalBorrowed, lowStock, outOfStock] = await Promise.all([
      SparePart.countDocuments({ status: "active" }),
      Category.countDocuments({ status: "active" }),
      Consumable.countDocuments({ status: "active" }),
      BorrowedTool.countDocuments({ status: { $in: ["borrowed", "overdue"] } }),
      SparePart.countDocuments({
        status: "active",
        $expr: { $and: [{ $gt: ["$quantity", 0] }, { $lte: ["$quantity", "$minStockLevel"] }] },
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
        totalSpareParts: totalParts, totalCategories: totalCats, totalConsumables,
        totalBorrowedTools: totalBorrowed, lowStockItems: lowStock, outOfStockItems: outOfStock,
        totalInventoryValue: partValue[0]?.total || 0, generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("getInventorySummaryReportData error:", error);
    res.status(500).json({ success: false, message: "Server error fetching summary" });
  }
};
