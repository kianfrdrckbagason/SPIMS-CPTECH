import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import User from "./src/models/User.js";

await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/spims_cptech");
const admin = await User.findOne({ email: "admin@cptech.com" }).lean();
console.log(JSON.stringify(admin, null, 2));
await mongoose.disconnect();
