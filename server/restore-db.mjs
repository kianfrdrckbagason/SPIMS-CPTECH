import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const backupDir = path.resolve(process.cwd(), 'mongo-backup');
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';

if (!fs.existsSync(backupDir)) {
  console.error(`Backup folder not found: ${backupDir}`);
  process.exit(1);
}

try {
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  const metadataPath = path.join(backupDir, 'metadata.json');
  const metadata = fs.existsSync(metadataPath)
    ? JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
    : { collections: [] };

  const files = fs.readdirSync(backupDir)
    .filter((file) => file.endsWith('.json') && file !== 'metadata.json')
    .sort();

  for (const file of files) {
    const collectionName = path.basename(file, '.json');
    const filePath = path.join(backupDir, file);
    const docs = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!docs.length) {
      console.log(`Skipped ${collectionName}: no documents`);
      continue;
    }

    const collection = db.collection(collectionName);
    await collection.deleteMany({});
    const normalizedDocs = docs.map((doc) => ({
      ...doc,
      _id: doc._id && typeof doc._id === 'string' ? doc._id : doc._id,
    }));

    if (normalizedDocs.length > 0) {
      await collection.insertMany(normalizedDocs);
    }

    console.log(`Restored ${normalizedDocs.length} documents to ${collectionName}`);
  }

  await mongoose.disconnect();
  console.log(`Restore complete. Database: ${mongoose.connection.name}`);
  console.log(`Backup source: ${backupDir}`);
  if (metadata.collections?.length) {
    console.log(`Collections expected: ${metadata.collections.join(', ')}`);
  }
} catch (error) {
  console.error('Restore failed:', error);
  process.exit(1);
}
