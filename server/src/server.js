import dotenv from "dotenv";
import connectDB from "./config/db.js";
import app from "./app.js";
import User from "./models/User.js";
import Category from "./models/Category.js";

dotenv.config();

// ---------------------------------------------------------------------------
// Startup environment validation
// The application must not start if any required secret is absent.
// Variable names are logged on failure — values are never logged.
// ---------------------------------------------------------------------------
const validateEnv = () => {
  const required = ["JWT_SECRET", "DEFAULT_ADMIN_EMAIL", "DEFAULT_ADMIN_PASSWORD"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      `[startup] Missing required environment variable(s): ${missing.join(", ")}. ` +
      "Set them in server/.env and restart."
    );
    process.exit(1);
  }
};

validateEnv();

await connectDB();

// ---------------------------------------------------------------------------
// Seed: default admin account
// Creates the admin user on first run only.
// If the account already exists the password is never touched, preserving
// any password changes made through the application.
// ---------------------------------------------------------------------------
const seedDefaultAdmin = async () => {
  try {
    const email = process.env.DEFAULT_ADMIN_EMAIL.toLowerCase();

    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      // Only repair role/status — never reset the password.
      let updated = false;

      if (existingAdmin.role !== "admin") {
        existingAdmin.role = "admin";
        updated = true;
      }

      if (existingAdmin.status !== "active") {
        existingAdmin.status = "active";
        updated = true;
      }

      if (updated) {
        await existingAdmin.save();
      }

      console.log("ℹ️  Default admin account is ready.");
    } else {
      await User.create({
        fullName: "CPTECH Administrator",
        email,
        password: process.env.DEFAULT_ADMIN_PASSWORD,
        role: "admin",
        status: "active",
      });

      console.log("✅ Default admin account created.");
    }
  } catch (error) {
    console.error("Default admin seed error:", error);
  }
};

const seedCategories = async () => {
  try {
    const categories = [
      "GTO MECHANICAL PARTS",
      "UV MECHANICAL PARTS",
      "LABEL PARTS",
      "CARBON VANE SPARE PARTS",
      "FOLDING GLUING SPARE PARTS",
      "MULLER MARTINI PARTS",
      "BINDING MECHANICAL PARTS",
      "BEARING PARTS",
      "MBO MECHANICAL PARTS",
      "ROLAND MECHANICAL PARTS",
      "RUBBER ROLLER ROLAND PARTS",
      "ELETROMECHANICAL R300",
      "MECHANICAL PARTS",
      "GTO RUBBER ROLLER",
      "R 300 ROLLER",
      "OTHER ELECTRICAL PARTS",
      "ROLAND ELECTRICAL PARTS",
      "LABEL ELECTRICAL PARTS",
      "COMMON ELECTRICAL PARTS",
      "COMPRESSOR AIR AND OIL FILTER",
      "ROTARY BINDING",
      "UV ELECTRICAL",
      "LABEL ROLLER",
      "UV LAMP PARTS",
      "GTO ELECTRICAL",
      "DIE CUT PARTS",
    ];

    for (const name of categories) {
      const existing = await Category.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
      if (!existing) {
        await Category.create({ name, status: "active", sortOrder: 0 });
      }
    }

    console.log(`✅ Seeded ${categories.length} default categories`);
  } catch (error) {
    console.error("Category seed error:", error);
  }
};

await seedDefaultAdmin();
await seedCategories();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
