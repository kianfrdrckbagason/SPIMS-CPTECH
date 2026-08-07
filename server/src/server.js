import dotenv from "dotenv";
import bcrypt from "bcrypt";
import connectDB from "./config/db.js";
import app from "./app.js";
import User from "./models/User.js";
import Category from "./models/Category.js";

dotenv.config();

await connectDB();

const seedDefaultAdmin = async () => {
  try {
    const email = (process.env.DEFAULT_ADMIN_EMAIL || "admin@cptech.com").toLowerCase();
    const password = process.env.DEFAULT_ADMIN_PASSWORD || "Admin@1234";

    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      let updated = false;

      if (existingAdmin.role !== "admin") {
        existingAdmin.role = "admin";
        updated = true;
      }

      if (existingAdmin.status !== "active") {
        existingAdmin.status = "active";
        updated = true;
      }

      const passwordMatches = existingAdmin.password
        ? await bcrypt.compare(password, existingAdmin.password)
        : false;

      if (!passwordMatches) {
        existingAdmin.password = password;
        updated = true;
      }

      if (updated) {
        await existingAdmin.save();
      }

      console.log(`ℹ️ Default admin account ready: ${email}`);
    } else {
      await User.create({
        fullName: "CPTECH Administrator",
        email,
        password,
        role: "admin",
        status: "active",
      });

      console.log(`✅ Default admin account created: ${email}`);
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