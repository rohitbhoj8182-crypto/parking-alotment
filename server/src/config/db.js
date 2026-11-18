const mongoose = require('mongoose');
const User = require('../models/User');
const Slot = require('../models/Slot');
const Booking = require('../models/Booking');
const Lot = require('../models/ParkingLot');
const migrate = require('../utils/migrate');
const reconcile = require('../utils/reconcile');

module.exports = async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000, maxPoolSize: 20 });
  // Make sure every index (including the unique/partial ones that protect data) exists before serving traffic.
  await Promise.all([User.init(), Lot.init(), Slot.init(), Booking.init()]);
  await migrate();
  const fixed = await reconcile();
  console.log(`MongoDB connected${fixed ? ` (repaired ${fixed} stale slot(s))` : ''}`);
};
