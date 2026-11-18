const router = require('express').Router();
const c = require('../controllers/bookingController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.post('/', c.create);
router.get('/mine', c.mine);
router.get('/active', adminOnly, c.active);
router.patch('/:id/release', c.release);

module.exports = router;
