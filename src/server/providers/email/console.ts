import "server-only";
import { randomUUID } from "node:crypto";
import { recordDevOutbox } from "@/server/dev/outbox";
import { logger } from "@/server/log";
import type { EmailMessage, EmailProvider } from "./types";

/** Mock email for environments without Mailpit. Messages show up at /dev/outbox. */
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console";

  async send(message: EmailMessage) {
    const id = `console-${randomUUID()}`;
    await recordDevOutbox({
      channel: "email",
      to: message.to,
      subject: message.subject,
      body: message.text,
      meta: message.meta,
    });
    logger.info({ id, meta: message.meta }, "email (console) sent");
    return { providerMessageId: id };
  }
}
