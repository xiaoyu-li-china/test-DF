require('dotenv').config({ path: '.env.test' });

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'test-community-exchange',
      args: ['--noauth', '--nojournal', '--syncdelay', '0'],
      storageEngine: 'ephemeralForTest'
    },
    binary: {
      skipMD5: true,
      version: '6.0.9'
    },
    spawn: {
      timeout: 300000
    },
    debug: false
  });

  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      heartbeatFrequencyMS: 5000
    });
  }
}, 300000);

afterEach(async () => {
  if (mongoose.connection.readyState !== 0 && mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
    }
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 300000);
