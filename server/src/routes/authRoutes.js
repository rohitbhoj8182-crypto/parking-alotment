const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { register, login, adminRegister, adminLogin, me } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// stricter limit on the admin endpoints so the secret key cannot be guessed
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

router.post('/register', register);
router.post('/login', login);
router.post('/admin/register', adminLimiter, adminRegister);
router.post('/admin/login', adminLimiter, adminLogin);
router.get('/me', protect, me);

module.exports = router;
