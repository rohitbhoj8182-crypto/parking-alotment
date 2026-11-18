const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Please log in');
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); }
  catch { throw new ApiError(401, 'Session expired, please log in again'); }
  const user = await User.findById(payload.id).select('name email role').lean();
  if (!user) throw new ApiError(401, 'Account no longer exists');
  req.user = user;
  next();
});

exports.adminOnly = (req, res, next) =>
  req.user.role === 'admin' ? next() : next(new ApiError(403, 'Admins only'));
