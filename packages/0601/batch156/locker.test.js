const request = require('supertest');
const { RedisContainer } = require('@testcontainers/redis');
const { initApp, getRedisClient, isVipLocker, VIP_LOCKER_RANGE } = require('./app');

describe('Locker System Integration Tests', () => {
  let redisContainer;
  let app;
  let redisClient;

  beforeAll(async () => {
    jest.setTimeout(60000);
    redisContainer = await new RedisContainer().start();
    const redisUrl = redisContainer.getConnectionUrl();
    app = await initApp(redisUrl);
    redisClient = getRedisClient();
  }, 60000);

  afterAll(async () => {
    if (redisClient) {
      await redisClient.disconnect();
    }
    if (redisContainer) {
      await redisContainer.stop();
    }
  });

  beforeEach(async () => {
    await redisClient.flushDb();
    await redisClient.set('lockers:initialized', 'false');
    const { initLockers } = require('./app');
    await initLockers();
  });

  describe('1. Concurrency Test - 20 users competing for lockers', () => {
    it('should NOT assign the same locker to multiple users in concurrent requests', async () => {
      const concurrency = 20;
      const requests = [];

      for (let i = 0; i < concurrency; i++) {
        const req = request(app)
          .post('/api/lockers/assign')
          .send({ gender: 'male', wristbandId: `WB${String(i).padStart(3, '0')}` });
        requests.push(req);
      }

      const responses = await Promise.all(requests);

      const successResponses = responses.filter(r => r.status === 200);
      const assignedLockers = successResponses.map(r => r.body.locker);
      const uniqueLockers = new Set(assignedLockers);

      expect(assignedLockers.length).toBe(concurrency);
      expect(uniqueLockers.size).toBe(concurrency);
      expect(assignedLockers.every(l => l.startsWith('M'))).toBe(true);
    }, 30000);

    it('should handle high concurrency without race conditions on single locker', async () => {
      const concurrency = 50;
      const requests = [];

      for (let i = 0; i < concurrency; i++) {
        const req = request(app)
          .post('/api/lockers/assign')
          .send({ gender: 'female', wristbandId: `CON${i}` });
        requests.push(req);
      }

      const responses = await Promise.all(requests);
      const successResponses = responses.filter(r => r.status === 200);
      const lockers = successResponses.map(r => r.body.locker);

      const lockerCounts = {};
      lockers.forEach(l => {
        lockerCounts[l] = (lockerCounts[l] || 0) + 1;
      });

      const duplicates = Object.values(lockerCounts).filter(c => c > 1);
      expect(duplicates.length).toBe(0);
    }, 30000);
  });

  describe('2. Release and Refresh Test', () => {
    it('should update available list immediately after release', async () => {
      const assignRes = await request(app)
        .post('/api/lockers/assign')
        .send({ gender: 'male', wristbandId: 'TEST001' });

      expect(assignRes.status).toBe(200);
      const locker = assignRes.body.locker;

      const availableBefore = await request(app).get('/api/lockers/available');
      expect(availableBefore.body.male.lockers).not.toContain(locker);
      expect(availableBefore.body.male.count).toBe(99);

      const releaseRes = await request(app)
        .patch('/api/lockers/release')
        .send({ wristbandId: 'TEST001' });

      expect(releaseRes.status).toBe(200);

      const availableAfter = await request(app).get('/api/lockers/available');
      expect(availableAfter.body.male.lockers).toContain(locker);
      expect(availableAfter.body.male.count).toBe(100);

      const statsAfter = await request(app).get('/api/lockers/stats');
      expect(statsAfter.body.male.free).toBe(100);
      expect(statsAfter.body.male.occupied).toBe(0);
    });
  });

  describe('3. VIP Priority Test', () => {
    it('should assign VIP lockers to VIP users first', async () => {
      const vipRequests = [];
      for (let i = 0; i < VIP_LOCKER_RANGE + 2; i++) {
        vipRequests.push(
          request(app)
            .post('/api/lockers/assign')
            .send({ gender: 'male', wristbandId: `VIP${i}`, isVip: true })
        );
      }

      const vipResponses = await Promise.all(vipRequests);
      const vipSuccess = vipResponses.filter(r => r.status === 200);

      const vipLockers = vipSuccess.filter(r => r.body.isVip);
      expect(vipLockers.length).toBe(VIP_LOCKER_RANGE);

      vipLockers.forEach(r => {
        const lockerNum = parseInt(r.body.locker.slice(1), 10);
        expect(lockerNum).toBeLessThanOrEqual(VIP_LOCKER_RANGE);
      });

      const nonVipInVipRequests = vipSuccess.filter(r => !r.body.isVip);
      expect(nonVipInVipRequests.length).toBe(2);
    }, 15000);

    it('should not give VIP lockers to non-VIP users when VIP lockers are free', async () => {
      const vipLockerCountBefore = (await request(app).get('/api/lockers/available')).body.male.vipCount;
      expect(vipLockerCountBefore).toBe(VIP_LOCKER_RANGE);

      const nonVipResponse = await request(app)
        .post('/api/lockers/assign')
        .send({ gender: 'male', wristbandId: 'NONVIP001', isVip: false });

      expect(nonVipResponse.body.isVip).toBe(false);

      const lockerNum = parseInt(nonVipResponse.body.locker.slice(1), 10);
      expect(lockerNum).toBeGreaterThan(VIP_LOCKER_RANGE);

      const vipLockerCountAfter = (await request(app).get('/api/lockers/available')).body.male.vipCount;
      expect(vipLockerCountAfter).toBe(VIP_LOCKER_RANGE);
    });
  });

  describe('4. Auto Release Test', () => {
    it('should auto-release lockers after timeout', async () => {
      const assignRes = await request(app)
        .post('/api/lockers/assign')
        .send({ gender: 'male', wristbandId: 'TIMEOUT001' });

      expect(assignRes.status).toBe(200);
      const locker = assignRes.body.locker;

      const oldCheckinTime = Math.floor(Date.now() / 1000) - (3 * 60 * 60);
      await redisClient.hSet('lockers:checkin', locker, oldCheckinTime.toString());

      const { tryReleaseLocker } = require('./app');
      const result = await new Promise((resolve) => {
        setTimeout(async () => {
          const released = await tryReleaseLocker('TIMEOUT001');
          resolve(released);
        }, 2000);
      });

      const wristbandLocker = await redisClient.hGet('lockers:wristband', 'TIMEOUT001');
      expect(wristbandLocker).toBeNull();

      const isFree = await redisClient.sIsMember('lockers:free:male', locker);
      expect(isFree).toBe(true);
    }, 10000);
  });

  describe('5. Gate Webhook Integration', () => {
    it('should assign locker on entry webhook event', async () => {
      const response = await request(app)
        .post('/api/gate/webhook')
        .send({ event: 'entry', gender: 'female', wristbandId: 'GATE001' });

      expect(response.status).toBe(200);
      expect(response.body.action).toBe('locker_assigned');
      expect(response.body.locker).toMatch(/^F\d{3}$/);
    });

    it('should release locker on exit webhook event', async () => {
      await request(app)
        .post('/api/gate/webhook')
        .send({ event: 'entry', gender: 'female', wristbandId: 'GATE002' });

      const exitResponse = await request(app)
        .post('/api/gate/webhook')
        .send({ event: 'exit', wristbandId: 'GATE002' });

      expect(exitResponse.status).toBe(200);
      expect(exitResponse.body.action).toBe('locker_released');
    });
  });

  describe('6. Wristband Lookup Test', () => {
    it('should return correct locker and status for a wristband', async () => {
      const assignRes = await request(app)
        .post('/api/lockers/assign')
        .send({ gender: 'male', wristbandId: 'LOOKUP001', isVip: true });

      const lookupRes = await request(app)
        .get('/api/lockers/wristband/LOOKUP001');

      expect(lookupRes.status).toBe(200);
      expect(lookupRes.body.wristbandId).toBe('LOOKUP001');
      expect(lookupRes.body.locker).toBe(assignRes.body.locker);
      expect(lookupRes.body.isVip).toBe(true);
      expect(lookupRes.body.autoReleaseIn).toMatch(/minutes/);
    });

    it('should return 404 for non-existent wristband', async () => {
      const lookupRes = await request(app)
        .get('/api/lockers/wristband/NONEXISTENT');

      expect(lookupRes.status).toBe(404);
    });
  });
});
