const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const generateActivationToken = (userId, tokenVersion) => {
  return jwt.sign(
    { userId, tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

const sendActivationEmailDirect = async (user, token) => {
  const activationUrl = `${process.env.APP_URL}/api/auth/activate/${token}`;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: user.email,
    subject: 'Activate Your Account',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Welcome to Our Platform!</h2>
        <p>Thank you for registering. Please click the button below to activate your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${activationUrl}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Activate Account
          </a>
        </div>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
        <p>Best regards,<br>Your Team</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Activation email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('Error sending activation email:', error);
    throw error;
  }
};

const sendActivationEmail = async (user) => {
  const token = generateActivationToken(user._id);
  return await sendActivationEmailDirect(user, token);
};

module.exports = {
  sendActivationEmail,
  sendActivationEmailDirect,
  generateActivationToken
};
