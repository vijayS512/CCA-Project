const Redis = require('ioredis');

// In-Memory cache fallback implementation if Redis server is unreachable
class MemoryCache {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
    console.log('[Cache] Initialized In-Memory Cache Fallback');
  }

  async get(key) {
    if (this.ttls.has(key)) {
      if (Date.now() > this.ttls.get(key)) {
        this.store.delete(key);
        this.ttls.delete(key);
        return null;
      }
    }
    const val = this.store.get(key);
    return val !== undefined ? val : null;
  }

  async set(key, value, mode, seconds) {
    this.store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    if (mode === 'EX' && seconds) {
      this.ttls.set(key, Date.now() + seconds * 1000);
    }
    return 'OK';
  }

  async del(key) {
    this.store.delete(key);
    this.ttls.delete(key);
    return 1;
  }

  async keys(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matched = [];
    for (const key of this.store.keys()) {
      if (regex.test(key)) matched.push(key);
    }
    return matched;
  }
}

let redisClient;
let cacheClient;
let isRedisConnected = false;

const initCache = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) {
          return null; // Stop retrying and fallback
        }
        return Math.min(times * 100, 1000);
      },
      enableOfflineQueue: false
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully to Redis Cache');
      isRedisConnected = true;
      cacheClient = redisClient;
    });

    redisClient.on('error', (err) => {
      if (!isRedisConnected) {
        console.warn(`[Redis] Notice: Redis not reachable (${err.message}). Using seamless In-Memory Cache.`);
        cacheClient = new MemoryCache();
      }
    });
  } catch (err) {
    console.warn('[Redis] Failed to initialize Redis. Using In-Memory Cache.');
    cacheClient = new MemoryCache();
  }

  if (!cacheClient) {
    cacheClient = new MemoryCache();
  }
};

initCache();

// Unified wrapper methods
module.exports = {
  get: async (key) => {
    try {
      return await cacheClient.get(key);
    } catch (e) {
      return null;
    }
  },
  set: async (key, value, mode = 'EX', seconds = 300) => {
    try {
      const valStr = typeof value === 'string' ? value : JSON.stringify(value);
      return await cacheClient.set(key, valStr, mode, seconds);
    } catch (e) {
      return null;
    }
  },
  del: async (key) => {
    try {
      return await cacheClient.del(key);
    } catch (e) {
      return null;
    }
  },
  delPattern: async (pattern) => {
    try {
      const keys = await cacheClient.keys(pattern);
      if (keys && keys.length > 0) {
        for (const k of keys) {
          await cacheClient.del(k);
        }
      }
    } catch (e) {
      // ignore
    }
  },
  getStatus: () => ({
    type: isRedisConnected ? 'Redis' : 'In-Memory Cache (Fallback)',
    connected: true
  })
};
