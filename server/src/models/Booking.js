const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
    // Snapshot of slot details so history stays correct even if the slot is edited or deleted later.
    lotName: { type: String, default: '' },
    slotCode: { type: String, required: true },
    slotType: { type: String, enum: ['public', 'private'], required: true },
    pricing: { type: String, enum: ['free', 'paid'], required: true },
    pricePerHour: { type: Number, default: 0 },
    vehicleNumber: { type: String, required: true, uppercase: true, trim: true },
    vehicleSize: { type: String, enum: ['small', 'large'], required: true },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    amount: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1, createdAt: -1 }); // "My bookings"
bookingSchema.index({ status: 1, createdAt: -1 }); // admin "active bookings"
// Database-level guarantees: one active booking per slot, one active booking per vehicle.
bookingSchema.index({ slot: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });
bookingSchema.index({ vehicleNumber: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });

module.exports = mongoose.model('Booking', bookingSchema);
