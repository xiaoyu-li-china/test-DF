const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const {
  createTempAuthorization,
  reviewAuthorization,
  getAuthorizationList,
  getStudentValidAuthorizations
} = require('../controllers/authorizationController');

const router = express.Router();

router.post('/temp', auth, requireRole('parent'), createTempAuthorization);
router.post('/:id/review', auth, requireRole('teacher'), reviewAuthorization);
router.get('/list', auth, getAuthorizationList);
router.get('/student/:student_id/valid', auth, getStudentValidAuthorizations);

module.exports = router;
