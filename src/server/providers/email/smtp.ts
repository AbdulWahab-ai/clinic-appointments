import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/env";
import { logger } from "@/server/log";
import type { EmailMessage, EmailProvider } from "./types";

/** SMTP email. Locally this points at Mailpit (http://localhost:8025). */
export class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp";
  private transporter: Transporter;

  constructor() {
    const e = env();
    this.transporter = nodemailer.createTransport({
      host: e.SMTP_HOST,
      port: e.SMTP_PORT,
      secure: e.SMTP_SECURE,
      auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD } : undefined,
    });
  }

  async send(message: EmailMessage) {
    const info = await this.transporter.sendMail({
      from: env().EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    logger.info({ id: info.messageId, meta: message.meta }, "email (smtp) sent");
    return { providerMessageId: info.messageId };
  }
}
