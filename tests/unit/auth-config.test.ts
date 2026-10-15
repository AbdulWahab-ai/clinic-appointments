import { describe, expect, it } from "vitest";
import { parseEnv } from "@/env";
import { auth } from "@/server/auth/auth";

/** Security-relevant Better Auth settings that must not regress silently. */
describe("auth configuration", () => {
  const options = auth.options;

  it("rate limits auth endpoints by default, strictest on OTP", () => {
    expect(options.rateLimit?.enabled).toBe(true);
    const rules = options.rateLimit?.customRules ?? {};
    expect(rules["/phone-number/send-otp"]).toMatchObject({ window: 60, max: 3 });
    expect(rules["/sign-in/email"]).toMatchObject({ window: 60, max: 10 });
    expect(rules["/two-factor/verify-totp"]).toMatchObject({ max: 10 });
  });

  it("refuses to turn rate limiting off in a real production deployment", () => {
    const base = {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://x@y/z",
      BETTER_AUTH_SECRET: "a-real-production-secret-0123456789abcdef",
      FIELD_ENCRYPTION_KEYS: "v1:MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    };
    expect(() => parseEnv({ ...base, AUTH_RATE_LIMIT: "off" })).toThrow(/test builds/);
    expect(
      parseEnv({ ...base, AUTH_RATE_LIMIT: "off", ENABLE_DEV_OUTBOX: "true" }).AUTH_RATE_LIMIT,
    ).toBe("off");
  });

  it("enforces a minimum password length", () => {
    expect(options.emailAndPassword?.minPasswordLength).toBeGreaterThanOrEqual(10);
  });

  it("enables phone OTP and TOTP 2FA", () => {
    const ids = options.plugins?.map((p) => p.id) ?? [];
    expect(ids).toEqual(expect.arrayContaining(["phone-number", "two-factor"]));
  });

  it("doesn't let sign-up set the super admin flag", () => {
    expect(options.user?.additionalFields?.isSuperAdmin).toMatchObject({ input: false });
  });

  it("uses secure cookies in production only", () => {
    expect(options.advanced?.useSecureCookies).toBe(false);
  });
});
