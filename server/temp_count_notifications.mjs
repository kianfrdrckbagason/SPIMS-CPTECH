import mongoose from 'mongoose';
import Notification from './src/models/Notification.js';

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/spims_cptech';

(async () => {
  try {
    await mongoose.connect(uri);
    const count = await Notification.countDocuments();
    console.log('NOTIFICATION_COUNT:', count);
    const docs = await Notification.find().sort({ createdAt: -1 }).limit(10).lean();
    console.log('LATEST_NOTIFICATIONS:', JSON.stringify(docs, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
