import "server-only";
import pino from "pino";
import { env } from "@/env";

/**
 * Structured logger. Patient data must never reach logs: the redact list covers the
 * usual field names, and call sites should log ids, not records.
 */
export const logger = pino({
  level: env().LOG_LEVEL,
  base: { service: process.env.SERVICE_NAME ?? "web" },
  redact: {
    paths: [
      "password",
      "*.password",
      "token",
      "*.token",
      "otp",
      "*.otp",
      "authorization",
      "*.authorization",
      "headers.cookie",
      "*.headers.cookie",
      "phone",
      "*.phone",
      "phoneNumber",
      "*.phoneNumber",
      "email",
      "*.email",
      "body",
      "*.body",
      "notes",
      "*.notes",
    ],
    censor: "[redacted]",
  },
  transport:
    env().NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } }
      : undefined,
});

export type Logger = typeof logger;
