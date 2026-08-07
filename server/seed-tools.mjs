import dotenv from 'dotenv';
dotenv.config();
import connectDB from './src/config/db.js';
import ToolInventory from './src/models/ToolInventory.js';

await connectDB();

// Clear all existing tools so the inventory only contains the tools below
const deleted = await ToolInventory.deleteMany({});
console.log(`Cleared ${deleted.deletedCount} existing tool(s) from inventory.`);

const tools = [
  {
    name: 'SET OF OPEN WRENCH',
    toolCode: 'SOW-001',
    category: 'Mechanical',
    condition: 'good',
    status: 'available',
    location: 'Tool Room',
    totalQuantity: 1,
    availableQuantity: 1,
  },
  {
    name: 'PULLER',
    toolCode: 'PUL-002',
    category: 'Mechanical',
    condition: 'good',
    status: 'available',
    location: 'Tool Room',
    totalQuantity: 1,
    availableQuantity: 1,
  },
  {
    name: 'CALIPER',
    toolCode: 'CAL-003',
    category: 'Measurement',
    condition: 'good',
    status: 'available',
    location: 'Tool Room',
    totalQuantity: 1,
    availableQuantity: 1,
  },
];

let created = 0;

for (const tool of tools) {
  await ToolInventory.create(tool);
  created++;
  console.log(`Created: ${tool.name} (${tool.toolCode})`);
}

const total = await ToolInventory.countDocuments();
console.log(`\nCompleted: Created=${created}, Total tools=${total}`);

process.exit(0);
