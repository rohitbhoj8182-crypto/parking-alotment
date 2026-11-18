const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const respond = (res, status, user) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.status(status).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
};

// Compares the key the admin typed with ADMIN_SECRET_KEY in constant time (hashing makes lengths equal).
const sha = (v) => crypto.createHash('sha256').update(String(v)).digest();
const checkAdminKey = (key) => {
  const real = process.env.ADMIN_SECRET_KEY;
  if (!real) throw new ApiError(503, 'Admin access is not set up yet: add ADMIN_SECRET_KEY to server/.env');
  if (typeof key !== 'string' || !crypto.timingSafeEqual(sha(key), sha(real))) throw new ApiError(403, 'Wrong secret key');
};

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (![name, email, password].every((v) => typeof v === 'string')) throw new ApiError(400, 'Name, email and password are required');
  // role is never taken from the request: public sign-up always creates a normal user
  const user = await User.create({ name, email, password });
  respond(res, 201, user);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string') throw new ApiError(400, 'Email and password are required');
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user || !(await user.matchPassword(password))) throw new ApiError(401, 'Incorrect email or password');
  if (user.role === 'admin') throw new ApiError(403, 'Admin accounts must log in from the Admin login page');
  respond(res, 200, user);
});

// POST /api/auth/admin/register  { name, email, password, secretKey }
exports.adminRegister = asyncHandler(async (req, res) => {
  const { name, email, password, secretKey } = req.body;
  checkAdminKey(secretKey);
  if (![name, email, password].every((v) => typeof v === 'string')) throw new ApiError(400, 'Name, email and password are required');
  const user = await User.create({ name, email, password, role: 'admin' });
  respond(res, 201, user);
});

// POST /api/auth/admin/login  { email, password, secretKey }
exports.adminLogin = asyncHandler(async (req, res) => {
  const { email, password, secretKey } = req.body;
  checkAdminKey(secretKey);
  if (typeof email !== 'string' || typeof password !== 'string') throw new ApiError(400, 'Email and password are required');
  const user = await User.findOne({ email: email.toLowerCase().trim(), role: 'admin' }).select('+password');
  if (!user || !(await user.matchPassword(password))) throw new ApiError(401, 'Incorrect email or password, or this is not an admin account');
  respond(res, 200, user);
});

exports.me = (req, res) => {
  const u = req.user;
  res.json({ user: { id: u._id, name: u.name, email: u.email, role: u.role } });
};
