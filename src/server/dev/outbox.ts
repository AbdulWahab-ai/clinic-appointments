import "server-only";
import { env } from "@/env";
import { systemDb } from "@/server/db/client";

/** On in development and test; in a production build only when ENABLE_DEV_OUTBOX is set (CI). */
export function devOutboxEnabled() {
  const e = env();
  return e.NODE_ENV !== "production" || e.ENABLE_DEV_OUTBOX;
}

/** Stores a message "sent" by a mock provider. No-op in production. */
export async function recordDevOutbox(input: {
  channel: string;
  to: string;
  subject?: string;
  body: string;
  meta?: Record<string, string>;
}) {
  if (!devOutboxEnabled()) return;
  await systemDb.devOutboxMessage.create({
    data: {
      channel: input.channel,
      to: input.to,
      subject: input.subject,
      body: input.body,
      meta: input.meta ?? {},
    },
  });
}

export async function listDevOutbox(limit = 50) {
  if (!devOutboxEnabled()) return [];
  return systemDb.devOutboxMessage.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}
