const redis = require('redis');
const { promisify } = require('util');

let client;
let setAsync;
let delAsync;
let getAsync;

const LOCK_PREFIX = 'lock:slot:';
const LOCK_TIMEOUT = 10000;

async function init() {
  if (client) return;
  
  client = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    retry_strategy: (options) => {
      if (options.error && options.error.code === 'ECONNREFUSED') {
        return new Error('The server refused the connection');
      }
      if (options.total_retry_time > 1000 * 60 * 60) {
        return new Error('Retry time exhausted');
      }
      if (options.attempt > 10) {
        return undefined;
      }
      return Math.min(options.attempt * 100, 3000);
    },
  });

  client.on('error', (err) => {
    console.error('Redis Client Error', err);
  });

  setAsync = promisify(client.set).bind(client);
  delAsync = promisify(client.del).bind(client);
  getAsync = promisify(client.get).bind(client);
}

function getLockKey(stationId, slotStart) {
  const slotKey = slotStart.toISOString().slice(0, 16).replace(/[:T]/g, '');
  return `${LOCK_PREFIX}${stationId}:${slotKey}`;
}

async function acquireLock(stationId, slotStart, timeoutMs = LOCK_TIMEOUT) {
  await init();
  
  const key = getLockKey(stationId, slotStart);
  const value = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
  
  const result = await setAsync(key, value, 'NX', 'PX', timeoutMs);
  
  if (result === 'OK') {
    return {
      key,
      value,
      release: async () => {
        const currentValue = await getAsync(key);
        if (currentValue === value) {
          await delAsync(key);
        }
      },
    };
  }
  
  return null;
}

async function releaseLock(lock) {
  if (!lock || !lock.key) return;
  try {
    await lock.release();
  } catch (err) {
    console.error('Error releasing lock', err);
  }
}

module.exports = {
  acquireLock,
  releaseLock,
  getLockKey,
  init,
};
