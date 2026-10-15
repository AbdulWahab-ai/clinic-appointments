import { Queue } from "bullmq";
import { z } from "zod";
import { bullmqConnection } from "@/server/redis";

/**
 * Queue names and job payload schemas. Every processor validates its payload with these,
 * so a malformed or stale job fails loudly instead of half-running.
 */
export const QUEUES = {
  maintenance: "maintenance",
} as const;

export const MaintenanceJobs = {
  heartbeat: z.object({ at: z.iso.datetime() }),
} as const;

export type MaintenanceJobName = keyof typeof MaintenanceJobs;

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 5_000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600 },
};

let maintenanceQueue: Queue | undefined;

export function getMaintenanceQueue(): Queue {
  maintenanceQueue ??= new Queue(QUEUES.maintenance, {
    connection: bullmqConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
  return maintenanceQueue;
}
