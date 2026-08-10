import dotenv from 'dotenv';
dotenv.config();
import connectDB from './src/config/db.js';
import Consumable from './src/models/Consumable.js';

await connectDB();

// Clear all existing consumables so the module only contains the records below
const deleted = await Consumable.deleteMany({});
console.log(`Cleared ${deleted.deletedCount} existing consumable record(s).`);

const consumables = [
  { name: 'Phillips Screw', unit: 'box', quantity: 200, status: 'active' },
  { name: 'Flat Head Screw', unit: 'box', quantity: 180, status: 'active' },
  { name: 'Hex Bolt', unit: 'box', quantity: 120, status: 'active' },
  { name: 'Hex Nut', unit: 'box', quantity: 150, status: 'active' },
  { name: 'Flat Washer', unit: 'box', quantity: 300, status: 'active' },
  { name: 'Lock Washer', unit: 'box', quantity: 250, status: 'active' },
  { name: 'Machine Screw', unit: 'box', quantity: 160, status: 'active' },
  { name: 'Self-Tapping Screw', unit: 'box', quantity: 140, status: 'active' },
  { name: 'Cable Tie', unit: 'pack', quantity: 500, status: 'active' },
  { name: 'Electrical Tape', unit: 'roll', quantity: 90, status: 'active' },
];

let created = 0;

for (const item of consumables) {
  await Consumable.create(item);
  created++;
  console.log(`Created: ${item.name}`);
}

const total = await Consumable.countDocuments();
console.log(`\nCompleted: Created=${created}, Total consumables=${total}`);

process.exit(0);

