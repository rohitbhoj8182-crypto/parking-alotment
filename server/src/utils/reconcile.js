const Slot = require('../models/Slot');
const Booking = require('../models/Booking');

// Self-healing: if the server crashed halfway through a booking/release, a slot may say "occupied"
// while no active booking points to it. Free those slots on startup.
module.exports = async function reconcile() {
  const occupied = await Slot.find({ status: 'occupied' }).select('currentBooking').lean();
  if (!occupied.length) return 0;
  const ids = occupied.map((s) => s.currentBooking).filter(Boolean);
  const active = new Set(
    (await Booking.find({ _id: { $in: ids }, status: 'active' }).select('_id').lean()).map((b) => String(b._id))
  );
  const stale = occupied.filter((s) => !s.currentBooking || !active.has(String(s.currentBooking))).map((s) => s._id);
  if (stale.length) {
    await Slot.updateMany({ _id: { $in: stale } }, { status: 'vacant', occupiedBy: null, currentBooking: null });
  }
  return stale.length;
};
