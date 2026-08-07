import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const backupDir = path.resolve(process.cwd(), 'mongo-backup');
fs.mkdirSync(backupDir, { recursive: true });

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';

try {
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const metadata = {
    createdAt: new Date().toISOString(),
    uri: mongoUri,
    dbName: mongoose.connection.name,
    collections: collections.map((collection) => collection.name),
  };

  fs.writeFileSync(path.join(backupDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

  for (const collection of collections) {
    const docs = await db.collection(collection.name).find({}).toArray();
    const serializableDocs = docs.map((doc) => ({
      ...doc,
      _id: doc._id?.toString?.() ?? doc._id,
    }));

    fs.writeFileSync(
      path.join(backupDir, `${collection.name}.json`),
      JSON.stringify(serializableDocs, null, 2)
    );

    console.log(`Exported ${collection.name}: ${serializableDocs.length} documents`);
  }

  await mongoose.disconnect();
  console.log(`Backup complete at ${backupDir}`);
} catch (error) {
  console.error('Backup failed:', error);
  process.exit(1);
}
