import { createLogger, type Logger } from '@arcagentic/logger';
import { Redis } from 'ioredis';
import { getRedisUrl } from '../config.js';

const REDIS_URL = getRedisUrl();
const createBusLogger = createLogger as (pkg: string, subsystem?: string) => Logger;
const log = createBusLogger('bus', 'redis');

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const pubRedis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const subRedis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on('error', (err: Error) => log.error({ err }, 'redis client error'));
pubRedis.on('error', (err: Error) => log.error({ err }, 'redis publish client error'));
subRedis.on('error', (err: Error) => log.error({ err }, 'redis subscribe client error'));
