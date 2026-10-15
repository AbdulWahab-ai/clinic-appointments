import "server-only";
import { Redis } from "ioredis";
import { env } from "@/env";
import { logger } from "@/server/log";

const globalForRedis = globalThis as unknown as { redis?: Redis };

/**
 * Shared Redis connection (rate limits, pub/sub fan-out, caches). BullMQ creates its own
 * connections from bullmqConnection() because workers need blocking commands.
 */
export function redis(): Redis {
  if (!globalForRedis.redis) {
    const client = new Redis(env().REDIS_URL, {
      // Connects on first command; commands issued while connecting are queued rather than
      // rejected, so concurrent first requests don't fail. Callers bound waits with timeouts.
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      connectTimeout: 2_000,
    });
    // Without a listener ioredis reports every failed reconnect as an unhandled error.
    client.on("error", (err) => logger.warn({ err: err.message }, "redis connection error"));
    globalForRedis.redis = client;
  }
  return globalForRedis.redis;
}

/** Fresh connection settings for BullMQ queues and workers. */
export function bullmqConnection(): Redis {
  return new Redis(env().REDIS_URL, { maxRetriesPerRequest: null });
}
