import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import sparePartRoutes from "./routes/sparePartRoutes.js";
import consumableRoutes from "./routes/consumableRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import toolInventoryRoutes from "./routes/toolInventoryRoutes.js";
import borrowedToolRoutes from "./routes/borrowedToolRoutes.js";
import stockInRoutes from "./routes/stockInRoutes.js";
import stockOutRoutes from "./routes/stockOutRoutes.js";
import adjustmentRoutes from "./routes/adjustmentRoutes.js";
import dailyConsumptionRoutes from "./routes/dailyConsumptionRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

const app = express();

app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? ["http://localhost:5173", process.env.CLIENT_URL].filter(Boolean)
    : true,
  credentials: true,
}));
app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false }));
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SPIMS API is running...",
    version: "1.0.0",
    features: [
      "Authentication",
      "Spare Parts / Consumables Inventory",
      "Stock In / Stock Out / Adjustment",
      "Complete Transaction History",
      "Tools Inventory & Borrowing / Return",
      "Daily Production Consumption / Monthly Summary",
      "Notifications (low stock, out of stock, overdue tools)",
      "Reports (Excel & PDF export)",
      "Dashboard with statistics & charts",
    ],
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/spare-parts", sparePartRoutes);
app.use("/api/consumables", consumableRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/tools", toolInventoryRoutes);
app.use("/api/borrowed-tools", borrowedToolRoutes);
app.use("/api/stock-in", stockInRoutes);
app.use("/api/stock-out", stockOutRoutes);
app.use("/api/adjustments", adjustmentRoutes);
app.use("/api/daily-consumption", dailyConsumptionRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (err.name === "MongoServerError" && err.code === 11000) {
    const key = Object.keys(err.keyPattern || {})[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate value for ${key || "field"}`,
    });
  }
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors || {}).map((e) => ({ field: e.path, message: e.message }));
    return res.status(400).json({ success: false, message: "Validation failed", errors });
  }
  if (err.name === "CastError") {
    return res.status(404).json({ success: false, message: "Record not found (invalid ID)" });
  }
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

export default app;