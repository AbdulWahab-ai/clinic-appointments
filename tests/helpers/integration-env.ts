import "dotenv/config";

// Integration tests run against TEST_DATABASE_URL, never the dev database.
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error("TEST_DATABASE_URL must be set for integration tests");
if (testUrl === process.env.DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL must point at a different database than DATABASE_URL");
}

(process.env as Record<string, string>).NODE_ENV = "test";
process.env.DATABASE_URL = testUrl;
process.env.LOG_LEVEL ??= "error";
process.env.EMAIL_PROVIDER = "console";
process.env.SMS_PROVIDER = "console";
