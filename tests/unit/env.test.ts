import { describe, expect, it } from "vitest";
import { parseEnv } from "@/env";

const base = {
  DATABASE_URL: "postgresql://x:y@localhost:5432/db",
  BETTER_AUTH_SECRET: "a-secret-that-is-definitely-long-enough-123",
  FIELD_ENCRYPTION_KEYS: "v1:MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
};

describe("env validation", () => {
  it("applies defaults", () => {
    const env = parseEnv(base);
    expect(env.NODE_ENV).toBe("development");
    expect(env.SMS_PROVIDER).toBe("console");
    expect(env.STAFF_IDLE_TIMEOUT_MINUTES).toBe(30);
    expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
  });

  it("lists every problem at once", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL[\s\S]*BETTER_AUTH_SECRET/);
  });

  it("rejects short secrets and bad keys", () => {
    expect(() => parseEnv({ ...base, BETTER_AUTH_SECRET: "short" })).toThrow(/at least 32/);
    expect(() => parseEnv({ ...base, FIELD_ENCRYPTION_KEYS: "v1:c2hvcnQ=" })).toThrow(/32-byte/);
  });

  it("refuses placeholder secrets in production", () => {
    expect(() =>
      parseEnv({
        ...base,
        NODE_ENV: "production",
        BETTER_AUTH_SECRET: "change-me-to-a-long-random-string-0000000000",
      }),
    ).toThrow(/real secret/);
    expect(() =>
      parseEnv({
        ...base,
        NODE_ENV: "production",
        FIELD_ENCRYPTION_KEYS: "v1:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      }),
    ).toThrow(/real key/);
  });

  it("requires Google credentials in pairs", () => {
    expect(() => parseEnv({ ...base, GOOGLE_CLIENT_ID: "id" })).toThrow(/both/);
    expect(
      parseEnv({ ...base, GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "s" }).GOOGLE_CLIENT_ID,
    ).toBe("id");
  });

  it("treats empty strings as unset and parses booleans", () => {
    const env = parseEnv({ ...base, ROOT_DOMAIN: "", SMTP_SECURE: "true" });
    expect(env.ROOT_DOMAIN).toBeUndefined();
    expect(env.SMTP_SECURE).toBe(true);
  });
});
