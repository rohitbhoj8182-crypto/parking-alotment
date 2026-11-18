const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, minlength: [2, 'Name is too short'], maxlength: 60 },
    email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Enter a valid email'] },
    password: { type: String, required: true, minlength: [6, 'Password must be at least 6 characters'], select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
});
userSchema.methods.matchPassword = function (plain) { return bcrypt.compare(plain, this.password); };

module.exports = mongoose.model('User', userSchema);
