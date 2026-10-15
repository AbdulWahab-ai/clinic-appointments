import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createClinicFixture, db, resetDb } from "@tests/helpers/db";

/**
 * The database-level double-booking guarantee from the init migration. Phase 2 builds the
 * booking service on top; this proves the constraint itself holds under concurrency.
 */
let fx: Awaited<ReturnType<typeof createClinicFixture>>;

const t = (hhmm: string) => new Date(`2030-03-04T${hhmm}:00Z`);

beforeAll(async () => {
  await resetDb();
  fx = await createClinicFixture("gamma");
});

beforeEach(async () => {
  await db.reservation.deleteMany();
});

afterAll(async () => {
  await db.$disconnect();
});

const block = (start: string, end: string, extra: Record<string, unknown> = {}) =>
  db.reservation.create({
    data: {
      clinicId: fx.clinic.id,
      providerId: fx.provider.id,
      kind: "BLOCK",
      occupiedStart: t(start),
      occupiedEnd: t(end),
      ...extra,
    },
  });

describe("reservation exclusion constraint", () => {
  it("rejects overlapping reservations for one provider", async () => {
    await block("05:00", "05:15");
    await expect(block("05:10", "05:25")).rejects.toThrow();
    await expect(block("04:50", "05:01")).rejects.toThrow();
    await expect(block("05:00", "05:15")).rejects.toThrow();
  });

  it("allows back-to-back slots (half-open ranges)", async () => {
    await block("05:00", "05:15");
    await expect(block("05:15", "05:30")).resolves.toBeDefined();
    await expect(block("04:45", "05:00")).resolves.toBeDefined();
  });

  it("allows overbook rows to overlap", async () => {
    await block("05:00", "05:15");
    await expect(block("05:00", "05:15", { isOverbook: true })).resolves.toBeDefined();
  });

  it("rejects empty or inverted ranges", async () => {
    await expect(block("05:00", "05:00")).rejects.toThrow();
    await expect(block("05:15", "05:00")).rejects.toThrow();
  });

  it("lets exactly one of many simultaneous bookings win", async () => {
    const attempts = 25;
    const results = await Promise.allSettled(
      Array.from({ length: attempts }, (_, i) =>
        // Different but overlapping windows, all fired at once.
        block(
          `05:${String(i % 10).padStart(2, "0")}`,
          `05:${String(15 + (i % 10)).padStart(2, "0")}`,
        ),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.reservation.count()).toBe(1);
  });
});
