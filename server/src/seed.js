require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Lot = require('./models/ParkingLot');
const Slot = require('./models/Slot');
const Booking = require('./models/Booking');

const upsertLot = (name, place, description) =>
  Lot.findOneAndUpdate({ name }, { $setOnInsert: { place, description, size: 1 } }, { upsert: true, new: true, collation: { locale: 'en', strength: 2 } });

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User.init(), Lot.init(), Slot.init(), Booking.init()]);

  for (const u of [
    { name: 'Admin', email: 'admin@parking.com', password: 'Admin@123', role: 'admin' },
    { name: 'Demo User', email: 'user@parking.com', password: 'User@123', role: 'user' },
  ]) {
    if (!(await User.findOne({ email: u.email }))) await User.create(u);
  }

  const mall = await upsertLot('City Mall Parking', 'Station Road, Mathura', 'Open-air lot next to the main mall entrance. Paid bays near the doors, free bays at the back.');
  const tower = await upsertLot('Residency Tower Parking', 'Civil Lines, Mathura', 'Reserved basement parking for tower residents and their guests. Ask the manager for the access code.');

  const privateHash = await bcrypt.hash('1234', 10);
  const pad = (n) => String(n).padStart(2, '0');
  const slots = [];
  for (let i = 1; i <= 10; i++) slots.push({ lot: mall._id, code: `A${pad(i)}`, type: 'public', pricing: 'paid', pricePerHour: i <= 6 ? 20 : 40, vehicleSize: i <= 6 ? 'small' : 'large' });
  for (let i = 1; i <= 6; i++) slots.push({ lot: mall._id, code: `B${pad(i)}`, type: 'public', pricing: 'free', pricePerHour: 0, vehicleSize: i <= 4 ? 'small' : 'large' });
  for (let i = 1; i <= 4; i++) slots.push({ lot: tower._id, code: `C${pad(i)}`, type: 'private', pricing: 'paid', pricePerHour: 60, vehicleSize: i <= 2 ? 'small' : 'large', accessCode: privateHash });
  for (let i = 1; i <= 2; i++) slots.push({ lot: tower._id, code: `D${pad(i)}`, type: 'private', pricing: 'free', pricePerHour: 0, vehicleSize: 'small', accessCode: privateHash });

  await Slot.bulkWrite(
    slots.map(({ lot, ...s }) => ({
      updateOne: { filter: { code: s.code }, update: { $setOnInsert: { ...s, status: 'vacant' }, $set: { lot } }, upsert: true },
    }))
  );
  for (const l of [mall, tower]) await Lot.updateOne({ _id: l._id }, { size: await Slot.countDocuments({ lot: l._id }) });
  const general = await Lot.findOne({ name: 'General Parking' });
  if (general && !(await Slot.exists({ lot: general._id }))) await Lot.deleteOne({ _id: general._id });

  console.log('Seeded. Admin: admin@parking.com / Admin@123 | User: user@parking.com / User@123 | Private access code: 1234. Admin login also needs ADMIN_SECRET_KEY from .env');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
