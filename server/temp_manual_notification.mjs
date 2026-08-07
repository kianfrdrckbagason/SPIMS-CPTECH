import mongoose from 'mongoose';
import Notification from './src/models/Notification.js';

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/spims_cptech';

(async () => {
  try {
    await mongoose.connect(uri);
    const n = await Notification.create({
      type: 'system',
      severity: 'info',
      title: 'Manual test',
      message: 'This is a test notification',
    });
    console.log('CREATED:', n);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
