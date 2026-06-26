const express = require('express');
const { register, activateAccount, resendActivationEmail } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.get('/activate/:token', activateAccount);
router.post('/resend-activation', resendActivationEmail);

module.exports = router;
