const jwt = require('jsonwebtoken');
const User = require('../models/User');
const EmailLog = require('../models/EmailLog');
const { generateActivationToken } = require('../services/emailService');
const { addActivationEmail } = require('../queues/emailQueue');

const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const user = await User.create({
      email,
      password,
      isActive: false,
      activationStatus: 'pending_email',
      activationTokenVersion: 0,
      lastActivationEmailSentAt: new Date()
    });

    const token = generateActivationToken(user._id, user.activationTokenVersion);

    await EmailLog.create({
      userId: user._id,
      email: user.email,
      token,
      status: 'pending'
    });

    await addActivationEmail(user, token);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Activation email is being sent.',
      userId: user._id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

const activateAccount = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Activation token is required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (decoded.tokenVersion !== user.activationTokenVersion) {
      return res.status(400).json({
        success: false,
        message: 'This activation link is no longer valid. A newer activation email has been sent.'
      });
    }

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Account is already activated'
      });
    }

    user.isActive = true;
    user.activationStatus = 'activated';
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account activated successfully'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: 'Activation token has expired. Please register again.'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid activation token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Activation failed',
      error: error.message
    });
  }
};

const RESEND_COOLDOWN_MS = 5 * 60 * 1000;

const resendActivationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });
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

    if (user.lastActivationEmailSentAt) {
      const elapsed = Date.now() - new Date(user.lastActivationEmailSentAt).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${remainingSeconds} seconds before requesting another activation email`,
          retryAfterSeconds: remainingSeconds
        });
      }
    }

    user.activationTokenVersion += 1;
    user.activationStatus = 'pending_email';
    user.lastActivationEmailSentAt = new Date();
    await user.save();

    const token = generateActivationToken(user._id, user.activationTokenVersion);

    await EmailLog.create({
      userId: user._id,
      email: user.email,
      token,
      status: 'pending'
    });

    await addActivationEmail(user, token);

    res.status(200).json({
      success: true,
      message: 'Activation email queued for resending. Previous activation links are now invalid.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resend activation email',
      error: error.message
    });
  }
};

module.exports = {
  register,
  activateAccount,
  resendActivationEmail
};
