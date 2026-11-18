const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Lot = require('../models/ParkingLot');
const Slot = require('../models/Slot');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const pick = require('../utils/pick');

// GET /api/lots  -> every parking with live vacant / occupied counts
exports.list = asyncHandler(async (req, res) => {
  const [lots, rows] = await Promise.all([
    Lot.find().select('name description place size').sort('name').limit(200).collation({ locale: 'en', strength: 2 }).lean(),
    Slot.aggregate([{ $group: { _id: { lot: '$lot', status: '$status' }, n: { $sum: 1 } } }]),
  ]);
  const counts = {};
  rows.forEach((r) => {
    const k = String(r._id.lot);
    counts[k] = counts[k] || { vacant: 0, occupied: 0 };
    counts[k][r._id.status] = r.n;
  });
  res.json(
    lots.map((l) => {
      const c = counts[String(l._id)] || { vacant: 0, occupied: 0 };
      return { ...l, vacant: c.vacant, occupied: c.occupied, total: c.vacant + c.occupied };
    })
  );
});

// POST /api/lots  { name, place, description, size, prefix, type, pricing, pricePerHour, vehicleSize, accessCode? }
// Creates the parking AND its `size` slots (prefix01 ... prefixNN) in one go.
exports.create = asyncHandler(async (req, res) => {
  const { name, place, description, prefix } = req.body;
  const size = Number(req.body.size);
  if (typeof name !== 'string' || typeof place !== 'string') throw new ApiError(400, 'Parking name and place are required');
  if (description !== undefined && typeof description !== 'string') throw new ApiError(400, 'Description must be text');
  if (typeof prefix !== 'string' || !/^[A-Za-z]{1,4}$/.test(prefix)) throw new ApiError(400, 'Slot code prefix must be 1 to 4 letters');
  if (!Number.isInteger(size) || size < 1 || size > 200) throw new ApiError(400, 'Size must be a whole number from 1 to 200');

  const base = pick(req.body, ['type', 'pricing', 'pricePerHour', 'vehicleSize']);
  if (base.type === 'private') {
    if (typeof req.body.accessCode !== 'string' || !req.body.accessCode) throw new ApiError(400, 'Private slots need an access code');
    base.accessCode = await bcrypt.hash(req.body.accessCode, 10); // hash once for all slots
  }
  const width = Math.max(2, String(size).length);
  const codes = Array.from({ length: size }, (_, i) => `${prefix.toUpperCase()}${String(i + 1).padStart(width, '0')}`);
  const taken = await Slot.find({ code: { $in: codes } }).select('code').lean();
  if (taken.length) {
    const list = taken.slice(0, 8).map((t) => t.code).join(', ');
    throw new ApiError(409, `These slot codes already exist: ${list}${taken.length > 8 ? '…' : ''}. Use a different prefix.`);
  }

  const lot = await Lot.create({ name, place, description, size, createdBy: req.user._id });
  try {
    await Slot.insertMany(codes.map((code) => ({ ...base, code, lot: lot._id })));
  } catch (err) {
    // roll back so a half-built parking is never left behind
    await Slot.deleteMany({ lot: lot._id });
    await Lot.deleteOne({ _id: lot._id });
    throw err;
  }
  res.status(201).json({ _id: lot._id, name: lot.name, slots: size, first: codes[0], last: codes[size - 1] });
});

// PUT /api/lots/:id  { name, place, description, size }
exports.update = asyncHandler(async (req, res) => {
  const lot = await Lot.findById(req.params.id);
  if (!lot) throw new ApiError(404, 'Parking lot not found');
  const data = pick(req.body, ['name', 'description', 'place', 'size']);
  if (data.size !== undefined) {
    data.size = Number(data.size);
    const count = await Slot.countDocuments({ lot: lot._id });
    if (data.size < count) throw new ApiError(409, `This parking already has ${count} slots, so its size cannot be lower than that.`);
  }
  lot.set(data);
  await lot.save();
  res.json({ _id: lot._id, name: lot.name });
});

// DELETE /api/lots/:id  (only when nobody is parked in it)
exports.remove = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid id');
  const lot = await Lot.findById(req.params.id).select('_id').lean();
  if (!lot) throw new ApiError(404, 'Parking lot not found');
  if (await Slot.exists({ lot: lot._id, status: 'occupied' })) throw new ApiError(409, 'Cars are parked here. Release them first.');
  await Slot.deleteMany({ lot: lot._id, status: 'vacant' });
  // a car may have parked in the instant between the check and the delete: never delete the parking then
  if (await Slot.exists({ lot: lot._id })) throw new ApiError(409, 'A car just parked here. Release it and try again.');
  await Lot.deleteOne({ _id: lot._id });
  res.json({ message: 'Parking deleted' });
});
