import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/env";

/**
 * UNSCOPED database client. Reads and writes across every clinic.
 *
 * Only for code that is deliberately cross-tenant: auth, tenancy resolution, background
 * jobs, seed, super admin. ESLint blocks importing it anywhere else. Request handlers
 * must use getTenantDb() from ./tenant.
 */
function createClient(url: string) {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
    log: env().NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForDb = globalThis as unknown as { systemDb?: ReturnType<typeof createClient> };

export const systemDb = globalForDb.systemDb ?? createClient(env().DATABASE_URL);

if (env().NODE_ENV !== "production") globalForDb.systemDb = systemDb;

export type SystemDb = typeof systemDb;
