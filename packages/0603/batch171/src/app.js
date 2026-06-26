const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);

  app.get('/', (req, res) => {
    res.json({
      message: 'Email Activation API with Bull Queue',
      authEndpoints: {
        register: 'POST /api/auth/register',
        activate: 'GET /api/auth/activate/:token',
        resendActivation: 'POST /api/auth/resend-activation'
      },
      adminEndpoints: {
        pendingUsers: 'GET /api/admin/users/pending',
        failedEmails: 'GET /api/admin/emails/failed',
        emailLogs: 'GET /api/admin/emails/logs',
        manualResend: 'POST /api/admin/emails/resend/:userId',
        queueStats: 'GET /api/admin/queue/stats',
        retryJob: 'POST /api/admin/queue/retry/:jobId'
      }
    });
  });

  return app;
};

module.exports = createApp;
