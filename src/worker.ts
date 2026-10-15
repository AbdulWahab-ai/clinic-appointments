/**
 * Background worker process (`pnpm worker`). Runs BullMQ processors: reminders,
 * calendar sync, hold sweeping, reports (added phase by phase).
 * Same codebase and Docker image as the web app, started with a different command.
 */
import "dotenv/config";
import { Worker, type Job } from "bullmq";
import { getMaintenanceQueue, MaintenanceJobs, QUEUES } from "@/server/jobs/queues";
import { logger as baseLogger } from "@/server/log";
import { bullmqConnection } from "@/server/redis";

const logger = baseLogger.child({ service: "worker" });

async function processMaintenance(job: Job) {
  switch (job.name) {
    case "heartbeat": {
      const data = MaintenanceJobs.heartbeat.parse(job.data);
      logger.debug({ at: data.at }, "heartbeat");
      return { ok: true };
    }
    default:
      throw new Error(`Unknown maintenance job: ${job.name}`);
  }
}

async function main() {
  const maintenance = new Worker(QUEUES.maintenance, processMaintenance, {
    connection: bullmqConnection(),
    concurrency: 2,
  });
  maintenance.on("failed", (job, err) =>
    logger.error({ queue: QUEUES.maintenance, job: job?.name, id: job?.id, err }, "job failed"),
  );

  // Idempotent: re-registering the same scheduler id just updates it.
  await getMaintenanceQueue().upsertJobScheduler(
    "heartbeat",
    { every: 60_000 },
    { name: "heartbeat", data: { at: new Date().toISOString() } },
  );

  logger.info({ queues: Object.values(QUEUES) }, "worker started");

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "worker shutting down");
    await maintenance.close();
    await getMaintenanceQueue().close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.fatal({ err }, "worker crashed on startup");
  process.exit(1);
});
