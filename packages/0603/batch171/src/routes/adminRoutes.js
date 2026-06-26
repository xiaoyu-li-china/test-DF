const express = require('express');
const {
  getPendingUsers,
  getFailedEmailLogs,
  manualResendActivation,
  getEmailLogs,
  getQueueStats,
  retryFailedJob
} = require('../controllers/adminController');

const router = express.Router();

router.get('/users/pending', getPendingUsers);
router.get('/emails/failed', getFailedEmailLogs);
router.get('/emails/logs', getEmailLogs);
router.post('/emails/resend/:userId', manualResendActivation);
router.get('/queue/stats', getQueueStats);
router.post('/queue/retry/:jobId', retryFailedJob);

module.exports = router;
