import { NextResponse } from "next/server";
import { systemDb } from "@/server/db/client";
import { redis } from "@/server/redis";

export const dynamic = "force-dynamic";

async function check(fn: () => Promise<unknown>, timeoutMs = 2000) {
  const started = performance.now();
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);
    return { ok: true, ms: Math.round(performance.now() - started) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "failed" };
  }
}

/**
 * Liveness + dependency check for load balancers and uptime monitors.
 * 200 when Postgres and Redis respond, 503 otherwise. Reveals no configuration.
 */
export async function GET() {
  const [database, cache] = await Promise.all([
    check(() => systemDb.$queryRaw`SELECT 1`),
    check(() => redis().ping()),
  ]);
  const ok = database.ok && cache.ok;
  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      checks: { database, redis: cache },
      time: new Date().toISOString(),
    },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
