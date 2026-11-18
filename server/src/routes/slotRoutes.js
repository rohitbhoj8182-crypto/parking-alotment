const router = require('express').Router();
const c = require('../controllers/slotController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.get('/', c.list);
router.get('/stats', c.stats);
router.post('/', adminOnly, c.create);
router.put('/:id', adminOnly, c.update);
router.delete('/:id', adminOnly, c.remove);

module.exports = router;
