import dotenv from 'dotenv';
dotenv.config();
import connectDB from './src/config/db.js';
import Category from './src/models/Category.js';
import SparePart from './src/models/SparePart.js';

await connectDB();

// Get GTO MECHANICAL PARTS category
const category = await Category.findOne({ name: { $regex: '^GTO MECHANICAL PARTS$', $options: 'i' } });

if (!category) {
  console.error('GTO MECHANICAL PARTS category not found');
  process.exit(1);
}

// Full GTO Mechanical Parts list (50 entries, two parts share #49 — same container)
const parts = [
  { no: 1,  name: 'PNEUMATIC CYLINDER',                bi: 1 },
  { no: 2,  name: 'SLIDER INK FOUNTAIN',                bi: 7 },
  { no: 3,  name: 'ADJUST MOUNT INKER',                bi: 8 },
  { no: 4,  name: 'PULLY POWDER PLASTER',              bi: 5 },
  { no: 5,  name: 'BANDO BELT T5-330',                 bi: 20 },
  { no: 6,  name: 'BANDO BELT T5-340',                 bi: 2 },
  { no: 7,  name: 'BANDO BELT T5-280',                 bi: 3 },
  { no: 8,  name: 'SOLENOID VALVE 24V',               bi: 4 },
  { no: 9,  name: 'FESTO VALVE 24V',                   bi: 4 },
  { no: 10, name: 'FESTO VALVE DSNU 25-25 P.A',        bi: 8 },
  { no: 11, name: 'FESTO VALVE 16-40 PPV-A',           bi: 7 },
  { no: 12, name: 'DAMPENING GEAR',                    bi: 8 },
  { no: 13, name: 'HOLDER SET DAMPENING LEFT & RIGHT', bi: 4 },
  { no: 14, name: 'PJ1156(2935) BELT H1/H2',           bi: 2 },
  { no: 15, name: 'VIBRATOR SHAFTING',                 bi: 1 },
  { no: 16, name: 'SOLENOID VALVE FEEDER',             bi: 12 },
  { no: 17, name: 'OVER RUNNING CLUTCH',               bi: 7 },
  { no: 18, name: 'PNEUMATIC VALVE 24V',               bi: 0 },
  { no: 19, name: 'GTO FEEDER WHEEL',                  bi: 9 },
  { no: 20, name: 'GRIPPER FEET CYLINDER',            bi: 1 },
  { no: 21, name: 'BELT 40 OPJ',                       bi: 1 },
  { no: 22, name: 'TAPELON SEAL KOMPAC',               bi: 10 },
  { no: 23, name: 'GEAR HOLDER',                       bi: 5 },
  { no: 24, name: 'BEARING HOLDER',                   bi: 2 },
  { no: 25, name: 'METAL JACKET',                      bi: 15 },
  { no: 26, name: 'SUCTION DRUM MOTOR',                bi: 1 },
  { no: 27, name: 'STARWHEEL',                         bi: 35 },
  { no: 28, name: 'INK DUCT END BLOCKS',               bi: 30 },
  { no: 29, name: 'GRIPPER PAD',                       bi: 200 },
  { no: 30, name: 'WASH UP BLADE',                     bi: 4 },
  { no: 31, name: 'BELT (1220mm x 89mm)',              bi: 1 },
  { no: 32, name: 'AIR FEEDER',                        bi: 2 },
  { no: 33, name: '2ND UNIT DRIVE SIDE',               bi: 1 },
  { no: 34, name: 'FESTO ESM 10 - 4 P-SA 61.184.1131', bi: 0 },
  { no: 35, name: 'OSCILLATOR BOLT',                   bi: 5 },
  { no: 36, name: 'PINLOCK GTO',                       bi: 10 },
  { no: 37, name: 'DELIVERY GRIPPER FINGER',           bi: 38 },
  { no: 38, name: 'SPRING FOR SWING',                  bi: 1 },
  { no: 39, name: 'CARBON BRUSH',                      bi: 0 },
  { no: 40, name: 'FESTO VALVE ADVC 32 - 25 - A P-A',  bi: 3 },
  { no: 41, name: 'SHEET SEPERATOR',                   bi: 6 },
  { no: 42, name: 'FESTO ESM 10 - 4 P-SA 61.184.1141/01', bi: 5 },
  { no: 43, name: 'SEPERATOR',                         bi: 0 },
  { no: 44, name: 'GRIPPER SET',                       bi: 5 },
  { no: 45, name: 'BLANKET CLAMP',                     bi: 13 },
  { no: 46, name: 'SHOULDER BOLT',                     bi: 0 },
  { no: 47, name: 'BRAKE PAD',                         bi: 0 },
  { no: 48, name: 'REAR SUCKER PAPER',                 bi: 0 },
  { no: 49, name: 'LOCK PLATE',                        bi: 0 },
  { no: 49, name: 'DELIVERY STOPPER',                  bi: 0 },
  { no: 50, name: 'PLASTIC SUCTION WHEEL',            bi: 0 },
];

let created = 0;
let exists = 0;
let updated = 0;

for (const part of parts) {
  const sku = `GTO-${String(part.no).padStart(3, '0')}`;

  const existing = await SparePart.findOne({ name: part.name });
  if (!existing) {
    await SparePart.create({
      name: part.name,
      partNumber: part.no,
      sku,
      category: category._id,
      quantity: part.bi,
      minStockLevel: 5,
      status: 'active',
    });
    created++;
    console.log(`Created: [${part.no}] ${part.name} (B.I.: ${part.bi})`);
  } else {
    // Update partNumber and sku if missing/outdated
    if (existing.partNumber !== part.no || existing.sku !== sku) {
      existing.partNumber = part.no;
      existing.sku = sku;
      existing.category = category._id;
      await existing.save();
      updated++;
      console.log(`Updated: [${part.no}] ${part.name}`);
    } else {
      exists++;
      console.log(`Exists:  [${part.no}] ${part.name}`);
    }
  }
}

const total = await SparePart.countDocuments({ category: category._id });
console.log(`\nCompleted: Created=${created}, Updated=${updated}, Exists=${exists}, Total in GTO=${total}`);

process.exit(0);
