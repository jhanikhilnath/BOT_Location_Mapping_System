import { createClient } from 'redis';

class RedisCache {
  constructor() {
    this.client = createClient({
      url: 'redis://redis:6379',
    });
    this.client.on('error', err => console.error('Redis Client Error:', err));
  }

  async initialize() {
    await this.client.connect();
    console.log('Redis Cache Connected.');
  }

  async getOrSet(key, dbFunc) {
    const cache = await this.client.get(key);

    if (cache) {
      return JSON.parse(cache);
    }

    const freshData = await dbFunc();

    await this.client.set(key, JSON.stringify(freshData), { EXP: 3600 });

    return freshData;
  }
}

const cacheUtil = new RedisCache();

await cacheUtil.initialize();

export default cacheUtil;
