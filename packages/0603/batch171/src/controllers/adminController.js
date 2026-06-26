const User = require('../models/User');
const EmailLog = require('../models/EmailLog');
const { generateActivationToken } = require('../services/emailService');
const { addActivationEmail, getFailedJobs, retryJob } = require('../queues/emailQueue');

const getPendingUsers = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) {
      query.activationStatus = status;
    } else {
      query.activationStatus = { $in: ['pending_email', 'pending_manual'] };
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get pending users',
      error: error.message
    });
  }
};

const getFailedEmailLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const logs = await EmailLog.find({ status: 'failed' })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await EmailLog.countDocuments({ status: 'failed' });

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get email logs',
      error: error.message
    });
  }
};

const manualResendActivation = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Account is already activated'
      });
    }

    const token = generateActivationToken(user._id, user.activationTokenVersion + 1);

    await EmailLog.create({
      userId: user._id,
      email: user.email,
      token,
      status: 'pending'
    });

    user.activationStatus = 'pending_email';
    user.activationTokenVersion += 1;
    user.lastActivationEmailSentAt = new Date();
    await user.save();

    await addActivationEmail(user, token);

    res.status(200).json({
      success: true,
      message: 'Activation email queued for manual resend'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resend activation email',
      error: error.message
    });
  }
};

const getEmailLogs = async (req, res) => {
  try {
    const { userId, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (userId) query.userId = userId;
    if (status) query.status = status;

    const logs = await EmailLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await EmailLog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get email logs',
      error: error.message
    });
  }
};

const getQueueStats = async (req, res) => {
  try {
    const failedJobs = await getFailedJobs();

    const stats = {
      failedCount: failedJobs.length,
      failedJobs: failedJobs.map(job => ({
        id: job.id,
        data: job.data,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn
      }))
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get queue stats',
      error: error.message
    });
  }
};

const retryFailedJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const success = await retryJob(jobId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job retried successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retry job',
      error: error.message
    });
  }
};

module.exports = {
  getPendingUsers,
  getFailedEmailLogs,
  manualResendActivation,
  getEmailLogs,
  getQueueStats,
  retryFailedJob
};
