const Slot = require('../models/Slot');
const Lot = require('../models/ParkingLot');

// Slots created before parking lots existed have no lot. Put them into a "General Parking" lot so nothing breaks.
module.exports = async function migrate() {
  const orphans = await Slot.countDocuments({ lot: null });
  if (!orphans) return 0;
  const lot = await Lot.findOneAndUpdate(
    { name: 'General Parking' },
    { $setOnInsert: { place: 'Not set yet', description: 'Slots created before parking lots existed. Edit this parking to add details.', size: orphans } },
    { upsert: true, new: true, collation: { locale: 'en', strength: 2 } }
  );
  await Slot.updateMany({ lot: null }, { lot: lot._id });
  const total = await Slot.countDocuments({ lot: lot._id });
  if (total > lot.size) await Lot.updateOne({ _id: lot._id }, { size: total });
  return orphans;
};
