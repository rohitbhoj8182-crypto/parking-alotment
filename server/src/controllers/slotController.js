const mongoose = require('mongoose');
const Slot = require('../models/Slot');
const Lot = require('../models/ParkingLot');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const pick = require('../utils/pick');

const ALLOWED = {
  type: ['public', 'private'],
  pricing: ['free', 'paid'],
  vehicleSize: ['small', 'large'],
  status: ['vacant', 'occupied'],
};
const EDITABLE = ['code', 'type', 'pricing', 'pricePerHour', 'vehicleSize', 'accessCode'];
const validId = (v) => typeof v === 'string' && mongoose.isValidObjectId(v);

// GET /api/slots?lot=&type=&pricing=&vehicleSize=&status=
exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  for (const [key, values] of Object.entries(ALLOWED)) {
    const v = req.query[key];
    if (v === undefined || v === '') continue;
    // typeof check blocks operator injection such as ?type[$ne]=x
    if (typeof v !== 'string' || !values.includes(v)) throw new ApiError(400, `Invalid ${key} filter`);
    filter[key] = v;
  }
  if (req.query.lot !== undefined && req.query.lot !== '') {
    if (!validId(req.query.lot)) throw new ApiError(400, 'Invalid parking filter');
    filter.lot = req.query.lot;
  }
  const slots = await Slot.find(filter)
    .select('lot code type pricing pricePerHour vehicleSize status occupiedBy currentBooking')
    .sort('code')
    .limit(500)
    .lean();
  const uid = String(req.user._id);
  res.json(
    slots.map(({ occupiedBy, currentBooking, ...s }) => {
      const mine = !!occupiedBy && String(occupiedBy) === uid;
      return { ...s, isMine: mine, bookingId: mine ? currentBooking : null }; // never leak who else is parked
    })
  );
});

// GET /api/slots/stats?lot=  (one aggregation)
exports.stats = asyncHandler(async (req, res) => {
  const match = validId(req.query.lot) ? { lot: new mongoose.Types.ObjectId(req.query.lot) } : {};
  const rows = await Slot.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  const out = { vacant: 0, occupied: 0 };
  rows.forEach((r) => { out[r._id] = r.count; });
  res.json({ ...out, total: out.vacant + out.occupied });
});

exports.create = asyncHandler(async (req, res) => {
  const lotId = req.body.lot;
  if (!validId(lotId)) throw new ApiError(400, 'Choose a parking lot');
  const lot = await Lot.findById(lotId).select('size').lean();
  if (!lot) throw new ApiError(404, 'Parking lot not found');
  const count = await Slot.countDocuments({ lot: lotId });
  if (count >= lot.size) throw new ApiError(409, `This parking is full (size ${lot.size}). Increase its size first.`);
  const slot = await Slot.create({ ...pick(req.body, EDITABLE), lot: lotId });
  res.status(201).json({ _id: slot._id, code: slot.code });
});

exports.update = asyncHandler(async (req, res) => {
  const slot = await Slot.findById(req.params.id).select('+accessCode');
  if (!slot) throw new ApiError(404, 'Slot not found');
  if (slot.status === 'occupied') throw new ApiError(409, 'Release the slot before editing it');
  const data = pick(req.body, EDITABLE);
  if (data.accessCode === '') delete data.accessCode; // blank = keep the current code
  slot.set(data);
  await slot.save();
  res.json({ _id: slot._id, code: slot.code });
});

exports.remove = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid id');
  // atomic: only a vacant slot can be deleted, so nobody's car is ever orphaned
  const deleted = await Slot.findOneAndDelete({ _id: req.params.id, status: 'vacant' });
  if (!deleted) throw new ApiError(409, 'Slot not found or currently occupied');
  res.json({ message: 'Slot deleted' });
});
