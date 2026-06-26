const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const jwt = require('jsonwebtoken');

let mongoServer;
let app;
let createApp;

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '24h';
process.env.APP_URL = 'http://localhost:3000';

jest.mock('../../src/queues/emailQueue', () => ({
  addActivationEmail: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
  getFailedJobs: jest.fn().mockResolvedValue([]),
  retryJob: jest.fn().mockResolvedValue(true),
  emailQueue: {
    getFailed: jest.fn().mockResolvedValue([])
  }
}));

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  createApp = require('../../src/app');
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }

  const { addActivationEmail } = require('../../src/queues/emailQueue');
  addActivationEmail.mockReset();
  addActivationEmail.mockResolvedValue({ id: 'test-job-id' });
});

const registerUser = (email = 'test@example.com', password = 'password123') => {
  return request(app)
    .post('/api/auth/register')
    .send({ email, password });
};

describe('Activation Flow Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user and return 201', async () => {
      const res = await registerUser();

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Activation email is being sent');
      expect(res.body.userId).toBeDefined();
    });

    it('should create user with isActive=false and activationStatus=pending_email', async () => {
      await registerUser();

      const User = require('../../src/models/User');
      const user = await User.findOne({ email: 'test@example.com' });

      expect(user).not.toBeNull();
      expect(user.isActive).toBe(false);
      expect(user.activationStatus).toBe('pending_email');
      expect(user.activationTokenVersion).toBe(0);
    });

    it('should queue an activation email via Bull', async () => {
      await registerUser();

      const { addActivationEmail } = require('../../src/queues/emailQueue');
      expect(addActivationEmail).toHaveBeenCalledTimes(1);

      const callArgs = addActivationEmail.mock.calls[0];
      expect(callArgs[0].email).toBe('test@example.com');
      expect(callArgs[1]).toBeDefined();
    });

    it('should create an EmailLog entry with status pending', async () => {
      await registerUser();

      const EmailLog = require('../../src/models/EmailLog');
      const log = await EmailLog.findOne({ email: 'test@example.com' });

      expect(log).not.toBeNull();
      expect(log.status).toBe('pending');
    });

    it('should return 400 if email is already registered', async () => {
      await registerUser();
      const res = await registerUser();

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already registered');
    });

    it('should return 400 if email or password is missing', async () => {
      const res1 = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' });

      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post('/api/auth/register')
        .send({ password: 'password123' });

      expect(res2.status).toBe(400);
    });

    it('should generate a valid JWT token containing userId and tokenVersion=0', async () => {
      await registerUser();

      const { addActivationEmail } = require('../../src/queues/emailQueue');
      const token = addActivationEmail.mock.calls[0][1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.userId).toBeDefined();
      expect(decoded.tokenVersion).toBe(0);
    });
  });

  describe('GET /api/auth/activate/:token', () => {
    const getActivationToken = async (email = 'test@example.com') => {
      const User = require('../../src/models/User');
      const { generateActivationToken } = require('../../src/services/emailService');
      const user = await User.findOne({ email });
      return generateActivationToken(user._id, user.activationTokenVersion);
    };

    it('should activate account with a valid token', async () => {
      await registerUser();

      const token = await getActivationToken();
      const res = await request(app).get(`/api/auth/activate/${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('activated successfully');
    });

    it('should set isActive=true and activationStatus=activated after activation', async () => {
      await registerUser();

      const token = await getActivationToken();
      await request(app).get(`/api/auth/activate/${token}`);

      const User = require('../../src/models/User');
      const user = await User.findOne({ email: 'test@example.com' });

      expect(user.isActive).toBe(true);
      expect(user.activationStatus).toBe('activated');
    });

    it('should return 400 when activating an already activated account', async () => {
      await registerUser();

      const token = await getActivationToken();
      await request(app).get(`/api/auth/activate/${token}`);

      const res = await request(app).get(`/api/auth/activate/${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already activated');
    });

    it('should return 400 for an invalid token', async () => {
      const res = await request(app).get('/api/auth/activate/invalid-token-here');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid activation token');
    });

    it('should return 400 for a token with wrong tokenVersion (old link)', async () => {
      await registerUser();

      const User = require('../../src/models/User');
      const { generateActivationToken } = require('../../src/services/emailService');

      const user = await User.findOne({ email: 'test@example.com' });
      const oldToken = generateActivationToken(user._id, 0);

      user.activationTokenVersion = 1;
      await user.save();

      const res = await request(app).get(`/api/auth/activate/${oldToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('no longer valid');
    });

    it('should return 404 if user in token does not exist', async () => {
      const fakeUserId = new mongoose.Types.ObjectId();
      const { generateActivationToken } = require('../../src/services/emailService');
      const token = generateActivationToken(fakeUserId, 0);

      const res = await request(app).get(`/api/auth/activate/${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('User not found');
    });
  });

  describe('POST /api/auth/resend-activation', () => {
    it('should resend activation email and increment tokenVersion', async () => {
      await registerUser();

      const User = require('../../src/models/User');
      const userBefore = await User.findOne({ email: 'test@example.com' });
      const oldTokenVersion = userBefore.activationTokenVersion;

      userBefore.lastActivationEmailSentAt = new Date(Date.now() - 10 * 60 * 1000);
      await userBefore.save();

      const res = await request(app)
        .post('/api/auth/resend-activation')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const userAfter = await User.findOne({ email: 'test@example.com' });
      expect(userAfter.activationTokenVersion).toBe(oldTokenVersion + 1);
    });

    it('should return 429 if resend is requested within 5 minutes', async () => {
      await registerUser();

      const res = await request(app)
        .post('/api/auth/resend-activation')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(429);
      expect(res.body.success).toBe(false);
      expect(res.body.retryAfterSeconds).toBeDefined();
      expect(res.body.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('should make old activation token invalid after resend', async () => {
      await registerUser();

      const User = require('../../src/models/User');
      const { generateActivationToken } = require('../../src/services/emailService');

      const userBeforeResend = await User.findOne({ email: 'test@example.com' });
      const oldToken = generateActivationToken(userBeforeResend._id, userBeforeResend.activationTokenVersion);

      userBeforeResend.lastActivationEmailSentAt = new Date(Date.now() - 10 * 60 * 1000);
      await userBeforeResend.save();

      await request(app)
        .post('/api/auth/resend-activation')
        .send({ email: 'test@example.com' });

      const res = await request(app).get(`/api/auth/activate/${oldToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('no longer valid');
    });

    it('should return 404 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/resend-activation')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 if account is already activated', async () => {
      await registerUser();

      const User = require('../../src/models/User');
      const user = await User.findOne({ email: 'test@example.com' });
      user.isActive = true;
      user.activationStatus = 'activated';
      await user.save();

      const res = await request(app)
        .post('/api/auth/resend-activation')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already activated');
    });
  });

  describe('Full activation flow end-to-end', () => {
    it('should complete the entire register -> activate -> duplicate-activate flow', async () => {
      const registerRes = await registerUser('e2e@example.com', 'password123');
      expect(registerRes.status).toBe(201);

      const User = require('../../src/models/User');
      const { generateActivationToken } = require('../../src/services/emailService');

      const userAfterRegister = await User.findOne({ email: 'e2e@example.com' });
      expect(userAfterRegister.isActive).toBe(false);
      expect(userAfterRegister.activationStatus).toBe('pending_email');

      const activationToken = generateActivationToken(
        userAfterRegister._id,
        userAfterRegister.activationTokenVersion
      );

      const activateRes = await request(app)
        .get(`/api/auth/activate/${activationToken}`);
      expect(activateRes.status).toBe(200);
      expect(activateRes.body.success).toBe(true);

      const userAfterActivation = await User.findOne({ email: 'e2e@example.com' });
      expect(userAfterActivation.isActive).toBe(true);
      expect(userAfterActivation.activationStatus).toBe('activated');

      const duplicateActivateRes = await request(app)
        .get(`/api/auth/activate/${activationToken}`);
      expect(duplicateActivateRes.status).toBe(400);
      expect(duplicateActivateRes.body.message).toContain('already activated');
    });
  });
});
