const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Slot = require('../models/Slot');
const Booking = require('../models/Booking');
const Lot = require('../models/ParkingLot');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const freeSlot = (slotId, bookingId) =>
  Slot.updateOne({ _id: slotId, currentBooking: bookingId }, { status: 'vacant', occupiedBy: null, currentBooking: null });

// POST /api/bookings
exports.create = asyncHandler(async (req, res) => {
  const { slotId, vehicleNumber, vehicleSize, accessCode } = req.body;
  if (!mongoose.isValidObjectId(slotId)) throw new ApiError(400, 'Invalid slot');
  if (!['small', 'large'].includes(vehicleSize)) throw new ApiError(400, 'Choose a vehicle size');
  const plate = String(vehicleNumber || '').toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9-]{4,15}$/.test(plate)) throw new ApiError(400, 'Enter a valid vehicle number');

  const slot = await Slot.findById(slotId).select('+accessCode').lean();
  if (!slot) throw new ApiError(404, 'Slot not found');
  if (slot.status !== 'vacant') throw new ApiError(409, 'This slot was just taken');
  if (slot.vehicleSize === 'small' && vehicleSize === 'large') throw new ApiError(400, 'A large vehicle does not fit in a small slot');
  if (slot.type === 'private') {
    const ok = typeof accessCode === 'string' && accessCode && (await bcrypt.compare(accessCode, slot.accessCode));
    if (!ok) throw new ApiError(403, 'Wrong access code for this private slot');
  }

  const lot = await Lot.findById(slot.lot).select('name').lean();

  // Step 1: atomically claim the slot. Only one request can ever flip vacant -> occupied.
  const bookingId = new mongoose.Types.ObjectId();
  const claimed = await Slot.findOneAndUpdate(
    { _id: slotId, status: 'vacant' },
    { status: 'occupied', occupiedBy: req.user._id, currentBooking: bookingId }
  );
  if (!claimed) throw new ApiError(409, 'This slot was just taken');

  // Step 2: write the booking. If it fails (e.g. vehicle already parked), give the slot back.
  try {
    const booking = await Booking.create({
      _id: bookingId,
      user: req.user._id,
      slot: slot._id,
      lotName: lot ? lot.name : '',
      slotCode: slot.code,
      slotType: slot.type,
      pricing: slot.pricing,
      pricePerHour: slot.pricePerHour,
      vehicleNumber: plate,
      vehicleSize,
    });
    res.status(201).json(booking);
  } catch (err) {
    await freeSlot(slot._id, bookingId);
    throw err;
  }
});

// GET /api/bookings/mine?page=1
exports.mine = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 20;
  const bookings = await Booking.find({ user: req.user._id })
    .sort('-createdAt').skip((page - 1) * limit).limit(limit).lean();
  res.json(bookings);
});

// GET /api/bookings/active  (admin)
exports.active = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ status: 'active' })
    .sort('-createdAt').limit(200).populate('user', 'name email').lean();
  res.json(bookings);
});

// PATCH /api/bookings/:id/release
exports.release = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, status: 'active' }).lean();
  if (!booking) throw new ApiError(404, 'Active booking not found');
  if (String(booking.user) !== String(req.user._id) && req.user.role !== 'admin') {
    throw new ApiError(403, 'This is not your booking');
  }
  const endTime = new Date();
  const hours = Math.max(1, Math.ceil((endTime - booking.startTime) / 3600000)); // billed per started hour
  const amount = booking.pricing === 'paid' ? hours * booking.pricePerHour : 0;

  // atomic: only one release can succeed
  const done = await Booking.findOneAndUpdate(
    { _id: booking._id, status: 'active' },
    { status: 'completed', endTime, amount },
    { new: true }
  );
  if (!done) throw new ApiError(409, 'Booking was already released');
  await freeSlot(booking.slot, booking._id);
  res.json(done);
});
