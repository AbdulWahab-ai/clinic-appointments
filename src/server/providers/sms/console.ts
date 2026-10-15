import "server-only";
import { randomUUID } from "node:crypto";
import { recordDevOutbox } from "@/server/dev/outbox";
import { logger } from "@/server/log";
import { maskPhone } from "@/lib/phone";
import type { SmsMessage, SmsProvider } from "./types";

/** Mock SMS: nothing leaves the machine. Messages show up at /dev/outbox. */
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = "console";

  async send(message: SmsMessage) {
    const id = `console-${randomUUID()}`;
    await recordDevOutbox({
      channel: "sms",
      to: message.to,
      body: message.body,
      meta: message.meta,
    });
    logger.info({ to: maskPhone(message.to), id, meta: message.meta }, "sms (console) sent");
    return { providerMessageId: id };
  }
}
