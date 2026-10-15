import "server-only";
import { env } from "@/env";
import { ConsoleEmailProvider } from "./email/console";
import { SmtpEmailProvider } from "./email/smtp";
import type { EmailProvider } from "./email/types";
import { ConsoleSmsProvider } from "./sms/console";
import type { SmsProvider } from "./sms/types";

/**
 * Picks each integration's implementation from env. Real providers are added here as
 * each phase lands; every one keeps a mock so the app runs with no paid accounts.
 */
let sms: SmsProvider | undefined;
let email: EmailProvider | undefined;

export function smsProvider(): SmsProvider {
  sms ??= (() => {
    switch (env().SMS_PROVIDER) {
      case "console":
        return new ConsoleSmsProvider();
    }
  })();
  return sms;
}

export function emailProvider(): EmailProvider {
  email ??= (() => {
    switch (env().EMAIL_PROVIDER) {
      case "smtp":
        return new SmtpEmailProvider();
      case "console":
        return new ConsoleEmailProvider();
    }
  })();
  return email;
}
