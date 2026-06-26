const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const {
  getParentChildren,
  getChildrenTodayStatus
} = require('../controllers/parentController');

const router = express.Router();

router.get('/children', auth, requireRole('parent'), getParentChildren);
router.get('/children/today-status', auth, requireRole('parent'), getChildrenTodayStatus);

module.exports = router;
