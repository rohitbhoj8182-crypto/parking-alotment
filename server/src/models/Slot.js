const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const slotSchema = new mongoose.Schema(
  {
    code: { type: String, required: [true, 'Slot code is required'], unique: true, uppercase: true, trim: true, maxlength: 12 },
    lot: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingLot', required: [true, 'Choose a parking lot'] },
    type: { type: String, enum: ['public', 'private'], required: true },
    pricing: { type: String, enum: ['free', 'paid'], required: true },
    pricePerHour: { type: Number, default: 0, min: [0, 'Price cannot be negative'], max: 100000 },
    vehicleSize: { type: String, enum: ['small', 'large'], required: true },
    accessCode: { type: String, select: false }, // bcrypt hash, only for private slots
    status: { type: String, enum: ['vacant', 'occupied'], default: 'vacant' },
    occupiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    currentBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  },
  { timestamps: true }
);

// Serves the dashboard filters: equality on status/type/pricing/vehicleSize in one index scan.
slotSchema.index({ status: 1, type: 1, pricing: 1, vehicleSize: 1 });
slotSchema.index({ lot: 1, status: 1 }); // per-parking vacant/occupied counts and capacity checks
slotSchema.index({ lot: 1, code: 1 }); // slots of one parking, sorted by code

slotSchema.pre('validate', function () {
  if (this.pricing === 'free') this.pricePerHour = 0;
  if (this.pricing === 'paid' && !(this.pricePerHour > 0)) this.invalidate('pricePerHour', 'Paid slots need a price above 0');
  if (this.type === 'private' && !this.accessCode) this.invalidate('accessCode', 'Private slots need an access code');
  if (this.type === 'public') this.accessCode = undefined;
});

slotSchema.pre('save', async function () {
  if (this.accessCode && this.isModified('accessCode')) this.accessCode = await bcrypt.hash(String(this.accessCode), 10);
});

module.exports = mongoose.model('Slot', slotSchema);
