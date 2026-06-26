const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const {
  scanCheckin,
  manualCheckin,
  getClassTodayCheckinStatus,
  getStudentCheckinRecords
} = require('../controllers/checkinController');

const router = express.Router();

router.post('/scan', auth, requireRole('parent'), scanCheckin);
router.post('/manual', auth, requireRole('teacher'), manualCheckin);
router.get('/class/:class_id/today', auth, requireRole('teacher'), getClassTodayCheckinStatus);
router.get('/student/:student_id/records', auth, getStudentCheckinRecords);

module.exports = router;
