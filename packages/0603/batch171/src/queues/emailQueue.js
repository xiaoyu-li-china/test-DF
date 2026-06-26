const Bull = require('bull');
const EmailLog = require('../models/EmailLog');
const User = require('../models/User');
const { sendActivationEmailDirect } = require('../services/emailService');

const emailQueue = new Bull('activation-emails', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  defaultJobOptions: {
    attempts: parseInt(process.env.EMAIL_MAX_RETRIES) || 3,
    backoff: {
      type: 'exponential',
      delay: parseInt(process.env.EMAIL_RETRY_DELAY) || 60000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});

emailQueue.process(async (job) => {
  const { user, token } = job.data;
  console.log(`Processing email job for ${user.email}, attempt ${job.attemptsMade + 1}`);

  try {
    await sendActivationEmailDirect(user, token);

    await EmailLog.create({
      userId: user._id,
      email: user.email,
      token,
      status: 'sent',
      attempts: job.attemptsMade + 1
    });

    return { success: true, email: user.email };
  } catch (error) {
    console.error(`Email failed for ${user.email}:`, error.message);

    if (job.attemptsMade + 1 >= (parseInt(process.env.EMAIL_MAX_RETRIES) || 3)) {
      await EmailLog.create({
        userId: user._id,
        email: user.email,
        token,
        status: 'failed',
        error: error.message,
        attempts: job.attemptsMade + 1
      });

      await User.findByIdAndUpdate(user._id, {
        activationStatus: 'pending_manual'
      });
    }

    throw error;
  }
});

emailQueue.on('completed', (job, result) => {
  console.log(`Email job completed for ${result.email}`);
});

emailQueue.on('failed', (job, err) => {
  console.log(`Email job failed for ${job.data.user.email}: ${err.message}`);
});

const addActivationEmail = async (user, token) => {
  await emailQueue.add({ user, token });
};

const getFailedJobs = async () => {
  return await emailQueue.getFailed();
};

const retryJob = async (jobId) => {
  const job = await emailQueue.getJob(jobId);
  if (job) {
    await job.retry();
    return true;
  }
  return false;
};

module.exports = {
  emailQueue,
  addActivationEmail,
  getFailedJobs,
  retryJob
};
