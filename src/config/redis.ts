// src/config/redis.ts

import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

export const createRedisClient = async (): Promise<RedisClientType> => {
  if (redisClient) return redisClient;

  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error', err);
  });

  await redisClient.connect();
  return redisClient;
};

export const getRedisClient = (): RedisClientType | null => {
  return redisClient;
};
