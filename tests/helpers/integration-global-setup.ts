import "dotenv/config";
import { execSync } from "node:child_process";

/** Applies migrations to the test database once per integration run. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL must be set for integration tests");
  if (url === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL must point at a different database than DATABASE_URL");
  }
  execSync("pnpm exec prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
