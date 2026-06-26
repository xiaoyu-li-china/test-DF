const express = require('express');
const { createClient } = require('redis');

const app = express();
app.use(express.json());

const redisClient = createClient({
  url: 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

const MALE_LOCKERS = 100;
const FEMALE_LOCKERS = 100;
const TOTAL_LOCKERS = MALE_LOCKERS + FEMALE_LOCKERS;
const VIP_LOCKER_RANGE = 10;
const AUTO_RELEASE_HOURS = 2;
const AUTO_RELEASE_MS = AUTO_RELEASE_HOURS * 60 * 60 * 1000;
const AUTO_RELEASE_CHECK_INTERVAL = 60 * 1000;
const MAX_RETRIES = 5;

const webhookSubscribers = new Map();

function getLockerKey(gender, num) {
  const prefix = gender === 'male' ? 'M' : 'F';
  const paddedNum = String(num).padStart(3, '0');
  return `${prefix}${paddedNum}`;
}

function isVipLocker(lockerKey) {
  const num = parseInt(lockerKey.slice(1), 10);
  return num <= VIP_LOCKER_RANGE;
}

async function initLockers() {
  const initialized = await redisClient.get('lockers:initialized');
  if (initialized) return;

  console.log('Initializing lockers...');
  
  for (let i = 1; i <= MALE_LOCKERS; i++) {
    const key = getLockerKey('male', i);
    await redisClient.hSet('lockers:status', key, 'free');
    if (isVipLocker(key)) {
      await redisClient.sAdd('lockers:free:male:vip', key);
    }
    await redisClient.sAdd('lockers:free:male', key);
  }
  
  for (let i = 1; i <= FEMALE_LOCKERS; i++) {
    const key = getLockerKey('female', i);
    await redisClient.hSet('lockers:status', key, 'free');
    if (isVipLocker(key)) {
      await redisClient.sAdd('lockers:free:female:vip', key);
    }
    await redisClient.sAdd('lockers:free:female', key);
  }
  
  await redisClient.set('lockers:initialized', 'true');
  console.log('Lockers initialized');
}

async function tryAssignLocker(gender, wristbandId, isVip) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const freeSetKey = isVip ? `lockers:free:${gender}:vip` : `lockers:free:${gender}`;
    const allFreeSetKey = `lockers:free:${gender}`;
    
    try {
      await redisClient.watch([freeSetKey, allFreeSetKey, 'lockers:wristband']);
      
      const existingLocker = await redisClient.hGet('lockers:wristband', wristbandId);
      if (existingLocker) {
        await redisClient.unwatch();
        return { error: 'wristband already has a locker', locker: existingLocker };
      }
      
      let locker = await redisClient.sRandMember(freeSetKey);
      
      if (!locker && isVip) {
        locker = await redisClient.sRandMember(allFreeSetKey);
      }
      
      if (!locker) {
        await redisClient.unwatch();
        return { noLocker: true };
      }
      
      const multi = redisClient.multi();
      multi.sRem(freeSetKey, locker);
      multi.sRem(allFreeSetKey, locker);
      if (isVipLocker(locker) && !isVip) {
        multi.sRem(`lockers:free:${gender}:vip`, locker);
      }
      multi.hSet('lockers:status', locker, wristbandId);
      multi.hSet('lockers:wristband', wristbandId, locker);
      multi.hSet('lockers:checkin', locker, Math.floor(Date.now() / 1000).toString());
      
      const result = await multi.exec();
      
      if (result !== null) {
        return { locker, isVip: isVipLocker(locker) };
      }
    } catch (err) {
      console.error('Transaction error, retrying...', err.message);
    }
  }
  
  return { error: 'failed after max retries' };
}

async function tryReleaseLocker(wristbandId) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await redisClient.watch(['lockers:wristband', 'lockers:status', 'lockers:checkin']);
      
      const locker = await redisClient.hGet('lockers:wristband', wristbandId);
      if (!locker) {
        await redisClient.unwatch();
        return { notFound: true };
      }
      
      const gender = locker.startsWith('M') ? 'male' : 'female';
      
      const multi = redisClient.multi();
      multi.hSet('lockers:status', locker, 'free');
      multi.hDel('lockers:wristband', wristbandId);
      multi.hDel('lockers:checkin', locker);
      multi.sAdd(`lockers:free:${gender}`, locker);
      if (isVipLocker(locker)) {
        multi.sAdd(`lockers:free:${gender}:vip`, locker);
      }
      
      const result = await multi.exec();
      
      if (result !== null) {
        return { locker };
      }
    } catch (err) {
      console.error('Release transaction error, retrying...', err.message);
    }
  }
  
  return { error: 'failed after max retries' };
}

function notifyWebhooks(event, data) {
  for (const [url, config] of webhookSubscribers.entries()) {
    if (config.events.includes(event) || config.events.includes('*')) {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, data, timestamp: new Date().toISOString() })
      }).catch(err => console.error(`Webhook failed for ${url}:`, err.message));
    }
  }
}

async function startAutoReleaseChecker() {
  setInterval(async () => {
    try {
      const cutoffTime = Math.floor((Date.now() - AUTO_RELEASE_MS) / 1000);
      const checkins = await redisClient.hGetAll('lockers:checkin');
      
      for (const [locker, checkinTimeStr] of Object.entries(checkins)) {
        const checkinTime = parseInt(checkinTimeStr, 10);
        if (checkinTime && checkinTime < cutoffTime) {
          const wristbandId = await redisClient.hGet('lockers:status', locker);
          if (wristbandId && wristbandId !== 'free') {
            const result = await tryReleaseLocker(wristbandId);
            if (result.locker) {
              console.log(`Auto-released locker ${locker} for wristband ${wristbandId}`);
              notifyWebhooks('auto-release', { locker, wristbandId });
            }
          }
        }
      }
    } catch (err) {
      console.error('Auto release check error:', err);
    }
  }, AUTO_RELEASE_CHECK_INTERVAL);
  
  console.log(`Auto-release checker started (${AUTO_RELEASE_HOURS}h timeout)`);
}

app.post('/api/lockers/assign', async (req, res) => {
  const { gender, wristbandId, isVip = false } = req.body;
  
  if (!gender || !wristbandId) {
    return res.status(400).json({ error: 'gender and wristbandId are required' });
  }
  
  if (gender !== 'male' && gender !== 'female') {
    return res.status(400).json({ error: 'gender must be male or female' });
  }

  try {
    const result = await tryAssignLocker(gender, wristbandId, isVip);

    if (result.noLocker) {
      return res.status(409).json({ error: 'no lockers available' });
    }

    if (result.error) {
      return res.status(400).json({ error: result.error, locker: result.locker });
    }

    notifyWebhooks('assign', { locker: result.locker, wristbandId, isVip: result.isVip });

    res.json({ success: true, locker: result.locker, wristbandId, isVip: result.isVip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

app.get('/api/lockers/wristband/:wristbandId', async (req, res) => {
  const { wristbandId } = req.params;

  try {
    const locker = await redisClient.hGet('lockers:wristband', wristbandId);
    if (!locker) {
      return res.status(404).json({ error: 'no locker found for this wristband' });
    }
    
    const checkinTime = await redisClient.hGet('lockers:checkin', locker);
    const remainingMs = checkinTime ? AUTO_RELEASE_MS - (Date.now() - parseInt(checkinTime) * 1000) : null;
    
    res.json({
      wristbandId,
      locker,
      isVip: isVipLocker(locker),
      checkinTime: checkinTime ? new Date(parseInt(checkinTime) * 1000).toISOString() : null,
      autoReleaseIn: remainingMs > 0 ? Math.ceil(remainingMs / 60000) + ' minutes' : 'expired'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

app.patch('/api/lockers/release', async (req, res) => {
  const { wristbandId } = req.body;
  
  if (!wristbandId) {
    return res.status(400).json({ error: 'wristbandId is required' });
  }

  try {
    const result = await tryReleaseLocker(wristbandId);

    if (result.notFound) {
      return res.status(404).json({ error: 'no locker found for this wristband' });
    }

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    notifyWebhooks('release', { locker: result.locker, wristbandId });

    res.json({ success: true, locker: result.locker, wristbandId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

app.get('/api/lockers/available', async (req, res) => {
  try {
    const [maleFree, femaleFree, maleVipFree, femaleVipFree] = await Promise.all([
      redisClient.sMembers('lockers:free:male'),
      redisClient.sMembers('lockers:free:female'),
      redisClient.sMembers('lockers:free:male:vip'),
      redisClient.sMembers('lockers:free:female:vip')
    ]);

    res.json({
      male: {
        count: maleFree.length,
        vipCount: maleVipFree.length,
        lockers: maleFree.sort(),
        vipLockers: maleVipFree.sort()
      },
      female: {
        count: femaleFree.length,
        vipCount: femaleVipFree.length,
        lockers: femaleFree.sort(),
        vipLockers: femaleVipFree.sort()
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

app.get('/api/lockers/stats', async (req, res) => {
  try {
    const [maleFreeCount, femaleFreeCount, maleVipFreeCount, femaleVipFreeCount] = await Promise.all([
      redisClient.sCard('lockers:free:male'),
      redisClient.sCard('lockers:free:female'),
      redisClient.sCard('lockers:free:male:vip'),
      redisClient.sCard('lockers:free:female:vip')
    ]);

    res.json({
      male: {
        free: maleFreeCount,
        occupied: MALE_LOCKERS - maleFreeCount,
        total: MALE_LOCKERS,
        vipFree: maleVipFreeCount,
        vipOccupied: VIP_LOCKER_RANGE - maleVipFreeCount
      },
      female: {
        free: femaleFreeCount,
        occupied: FEMALE_LOCKERS - femaleFreeCount,
        total: FEMALE_LOCKERS,
        vipFree: femaleVipFreeCount,
        vipOccupied: VIP_LOCKER_RANGE - femaleVipFreeCount
      },
      total: {
        free: maleFreeCount + femaleFreeCount,
        occupied: (MALE_LOCKERS - maleFreeCount) + (FEMALE_LOCKERS - femaleFreeCount),
        total: TOTAL_LOCKERS
      },
      autoRelease: {
        timeoutHours: AUTO_RELEASE_HOURS,
        checkIntervalMinutes: AUTO_RELEASE_CHECK_INTERVAL / 60000
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

app.post('/api/gate/webhook', async (req, res) => {
  const { event, gender, wristbandId, isVip = false } = req.body;

  if (event === 'entry') {
    if (!gender || !wristbandId) {
      return res.status(400).json({ error: 'gender and wristbandId required for entry event' });
    }

    try {
      const result = await tryAssignLocker(gender, wristbandId, isVip);

      if (result.noLocker) {
        return res.status(409).json({ error: 'no lockers available' });
      }

      if (result.error) {
        return res.status(400).json({ error: result.error, locker: result.locker });
      }

      notifyWebhooks('gate-entry', { locker: result.locker, wristbandId, isVip: result.isVip });

      return res.json({
        success: true,
        action: 'locker_assigned',
        locker: result.locker,
        wristbandId,
        isVip: result.isVip,
        autoReleaseIn: AUTO_RELEASE_HOURS + ' hours'
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'internal server error' });
    }
  }

  if (event === 'exit') {
    if (!wristbandId) {
      return res.status(400).json({ error: 'wristbandId required for exit event' });
    }

    try {
      const result = await tryReleaseLocker(wristbandId);

      notifyWebhooks('gate-exit', { locker: result.locker, wristbandId });

      return res.json({
        success: true,
        action: result.locker ? 'locker_released' : 'no_locker_found',
        locker: result.locker || null,
        wristbandId
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'internal server error' });
    }
  }

  res.status(400).json({ error: 'unknown event type' });
});

app.post('/api/webhooks/subscribe', async (req, res) => {
  const { url, events = ['*'] } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'webhook url is required' });
  }

  webhookSubscribers.set(url, { events, registeredAt: new Date() });
  
  res.json({
    success: true,
    subscribed: true,
    url,
    events,
    totalSubscribers: webhookSubscribers.size
  });
});

app.delete('/api/webhooks/subscribe', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'webhook url is required' });
  }

  const existed = webhookSubscribers.has(url);
  webhookSubscribers.delete(url);
  
  res.json({
    success: true,
    unsubscribed: existed,
    url,
    totalSubscribers: webhookSubscribers.size
  });
});

app.get('/api/webhooks', async (req, res) => {
  const subscribers = [];
  for (const [url, config] of webhookSubscribers.entries()) {
    subscribers.push({ url, events: config.events, registeredAt: config.registeredAt });
  }
  res.json({ subscribers, count: subscribers.length });
});

async function initApp(redisUrl) {
  if (redisUrl) {
    redisClient.options.url = redisUrl;
  }
  await redisClient.connect();
  await initLockers();
  startAutoReleaseChecker();
  return app;
}

function getApp() {
  return app;
}

function getRedisClient() {
  return redisClient;
}

const PORT = 3000;

async function startServer() {
  await initApp();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`VIP locker range: M001-M0${VIP_LOCKER_RANGE}, F001-F0${VIP_LOCKER_RANGE}`);
    console.log(`Auto-release timeout: ${AUTO_RELEASE_HOURS} hours`);
  });
}

if (require.main === module) {
  startServer().catch(console.error);
}

module.exports = { initApp, getApp, getRedisClient, startServer, isVipLocker, VIP_LOCKER_RANGE };
