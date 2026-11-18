const mongoose = require('mongoose');

const lotSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Parking name is required'], trim: true, minlength: [2, 'Parking name is too short'], maxlength: [80, 'Parking name is too long'] },
    description: { type: String, trim: true, maxlength: [500, 'Description can be at most 500 characters'], default: '' },
    place: { type: String, required: [true, 'Place is required'], trim: true, maxlength: [150, 'Place is too long'] },
    // size = how many slots this parking can hold
    size: { type: Number, required: [true, 'Size is required'], min: [1, 'Size must be at least 1'], max: [500, 'Size can be at most 500'], validate: { validator: Number.isInteger, message: 'Size must be a whole number' } },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Case-insensitive unique name: "City Mall" and "city mall" cannot both exist.
lotSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

module.exports = mongoose.model('ParkingLot', lotSchema);
