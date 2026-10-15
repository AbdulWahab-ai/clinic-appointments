import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0", ""])
  .default("false")
  .transform((v) => v === "true" || v === "1");

const optional = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_URL: z.url().default("http://localhost:3000"),
    ROOT_DOMAIN: optional,
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),

    DATABASE_URL: z.string().min(1),
    TEST_DATABASE_URL: optional,
    REDIS_URL: z.string().default("redis://localhost:6379"),

    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
    /** Auth endpoint rate limiting. Only E2E runs (many sign-ins from one IP) turn it off. */
    AUTH_RATE_LIMIT: z.enum(["on", "off"]).default("on"),
    STAFF_IDLE_TIMEOUT_MINUTES: z.coerce
      .number()
      .int()
      .min(5)
      .max(24 * 60)
      .default(30),
    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: optional,

    FIELD_ENCRYPTION_KEYS: z
      .string()
      .min(1)
      .refine(
        (v) =>
          v.split(",").every((entry) => {
            const [version, key] = entry.trim().split(":");
            return !!version && !!key && Buffer.from(key, "base64").length === 32;
          }),
        'FIELD_ENCRYPTION_KEYS must be "version:base64key" pairs with 32-byte keys',
      ),

    SMS_PROVIDER: z.enum(["console"]).default("console"),
    EMAIL_PROVIDER: z.enum(["smtp", "console"]).default("console"),
    EMAIL_FROM: z.string().default("Clinic Appointments <no-reply@clinic.local>"),
    SMTP_HOST: z.string().default("localhost"),
    SMTP_PORT: z.coerce.number().int().default(1025),
    SMTP_USER: optional,
    SMTP_PASSWORD: optional,
    SMTP_SECURE: bool,

    STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default(".data/uploads"),

    SENTRY_DSN: optional,
    /** Mock-message inbox at /dev/outbox. Always on outside production; CI E2E runs force it on. */
    ENABLE_DEV_OUTBOX: bool,
    SEED_PASSWORD: z.string().default("Demo-Clinic-2026!"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production") {
      if (env.BETTER_AUTH_SECRET.startsWith("change-me")) {
        ctx.addIssue({
          code: "custom",
          path: ["BETTER_AUTH_SECRET"],
          message: "Set a real secret in production",
        });
      }
      if (env.AUTH_RATE_LIMIT === "off" && !env.ENABLE_DEV_OUTBOX) {
        ctx.addIssue({
          code: "custom",
          path: ["AUTH_RATE_LIMIT"],
          message: "Auth rate limiting can only be turned off for test builds",
        });
      }
      if (/^v1:A+=*$/.test(env.FIELD_ENCRYPTION_KEYS)) {
        ctx.addIssue({
          code: "custom",
          path: ["FIELD_ENCRYPTION_KEYS"],
          message: "Set a real key in production",
        });
      }
    }
    if (!!env.GOOGLE_CLIENT_ID !== !!env.GOOGLE_CLIENT_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["GOOGLE_CLIENT_ID"],
        message: "Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither",
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${details}`);
  }
  return result.data;
}

let cached: Env | undefined;

/** Validated environment. Throws with a readable list of problems on first access. */
export function env(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
