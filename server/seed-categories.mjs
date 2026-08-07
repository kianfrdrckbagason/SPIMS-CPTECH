import dotenv from 'dotenv';
dotenv.config();
import connectDB from './src/config/db.js';
import Category from './src/models/Category.js';

await connectDB();

const names = [
  'GTO MECHANICAL PARTS',
  'UV MECHANICAL PARTS',
  'LABEL PARTS',
  'CARBON VANE SPARE PARTS',
  'FOLDING GLUING SPARE PARTS',
  'MULLER MARTINI PARTS',
  'BINDING MECHANICAL PARTS',
  'BEARING PARTS',
  'MBO MECHANICAL PARTS',
  'ROLAND MECHANICAL PARTS',
  'RUBBER ROLLER ROLAND PARTS',
  'ELETROMECHANICAL R300',
  'MECHANICAL PARTS',
  'GTO RUBBER ROLLER',
  'R 300 ROLLER',
  'OTHER ELECTRICAL PARTS',
  'ROLAND ELECTRICAL PARTS',
  'LABEL ELECTRICAL PARTS',
  'COMMON ELECTRICAL PARTS',
  'COMPRESSOR AIR AND OIL FILTER',
  'ROTARY BINDING',
  'UV ELECTRICAL',
  'LABEL ROLLER',
  'UV LAMP PARTS',
  'GTO ELECTRICAL',
  'DIE CUT PARTS'
];

for (const name of names) {
  const existing = await Category.findOne({ name: { $regex: '^' + name + '$', $options: 'i' } });
  if (!existing) {
    await Category.create({ name, status: 'active', sortOrder: 0 });
    console.log('created ' + name);
  } else {
    console.log('exists ' + name);
  }
}

const count = await Category.countDocuments();
console.log('total=' + count);
