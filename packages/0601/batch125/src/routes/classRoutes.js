const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const {
  getClassInfo,
  getTeacherClasses,
  getClassDailyStats
} = require('../controllers/classController');

const router = express.Router();

router.get('/:class_id', auth, getClassInfo);
router.get('/teacher/classes', auth, requireRole('teacher'), getTeacherClasses);
router.get('/:class_id/stats/daily', auth, requireRole('teacher'), getClassDailyStats);

module.exports = router;
