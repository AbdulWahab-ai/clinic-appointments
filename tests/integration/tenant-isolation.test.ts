import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getTenantDb } from "@/server/db/tenant";
import { TenantScopeError } from "@/server/db/tenant-scope";
import { createClinicFixture, db, resetDb } from "@tests/helpers/db";

/**
 * Definition of done: "no cross-clinic data leakage (proven by test)".
 * Clinic A's scoped client must not be able to read, change or link to clinic B's rows,
 * even when handed B's real ids.
 */
let a: Awaited<ReturnType<typeof createClinicFixture>>;
let b: Awaited<ReturnType<typeof createClinicFixture>>;

beforeAll(async () => {
  await resetDb();
  a = await createClinicFixture("alpha");
  b = await createClinicFixture("beta");
});

afterAll(async () => {
  await db.$disconnect();
});

describe("tenant isolation: reads", () => {
  it("lists only the tenant's own rows", async () => {
    const tenant = getTenantDb(a.clinic.id);
    const patients = await tenant.patient.findMany();
    expect(patients.map((p) => p.id)).toEqual([a.patient.id]);
    expect(await tenant.appointment.count()).toBe(1);
  });

  it.each([
    ["patient", () => b.patient.id],
    ["appointment", () => b.appointment.id],
    ["provider", () => b.provider.id],
    ["branch", () => b.branch.id],
    ["service", () => b.service.id],
  ] as const)("can't fetch another clinic's %s by id", async (model, id) => {
    const tenant = getTenantDb(a.clinic.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delegate = (tenant as any)[model];
    expect(await delegate.findUnique({ where: { id: id() } })).toBeNull();
    expect(await delegate.findFirst({ where: { id: id() } })).toBeNull();
  });

  it("can't reach another clinic's rows through a relation filter", async () => {
    const tenant = getTenantDb(a.clinic.id);
    const leaked = await tenant.appointment.findMany({ where: { patient: { id: b.patient.id } } });
    expect(leaked).toEqual([]);
  });

  it("throws when a query names another clinic explicitly", async () => {
    const tenant = getTenantDb(a.clinic.id);
    await expect(tenant.patient.findMany({ where: { clinicId: b.clinic.id } })).rejects.toThrow(
      TenantScopeError,
    );
  });
});

describe("tenant isolation: writes", () => {
  it("can't update another clinic's patient", async () => {
    const tenant = getTenantDb(a.clinic.id);
    await expect(
      tenant.patient.update({ where: { id: b.patient.id }, data: { name: "hijacked" } }),
    ).rejects.toThrow();
    const result = await tenant.patient.updateMany({
      where: { id: b.patient.id },
      data: { name: "hijacked" },
    });
    expect(result.count).toBe(0);
    expect((await db.patient.findUniqueOrThrow({ where: { id: b.patient.id } })).name).toBe(
      "Patient of beta",
    );
  });

  it("can't delete another clinic's appointment", async () => {
    const tenant = getTenantDb(a.clinic.id);
    const result = await tenant.appointment.deleteMany({ where: { id: b.appointment.id } });
    expect(result.count).toBe(0);
    expect(await db.appointment.findUnique({ where: { id: b.appointment.id } })).not.toBeNull();
  });

  it("stamps the tenant on created rows", async () => {
    const tenant = getTenantDb(a.clinic.id);
    const created = await tenant.patient.create({
      data: { mrNumber: "alpha-2", name: "New patient" } as never,
    });
    expect(created.clinicId).toBe(a.clinic.id);
  });

  it("refuses to create rows for another clinic", async () => {
    const tenant = getTenantDb(a.clinic.id);
    await expect(
      tenant.patient.create({ data: { clinicId: b.clinic.id, mrNumber: "x", name: "x" } }),
    ).rejects.toThrow(TenantScopeError);
  });

  it("database rejects an appointment linking clinic A to clinic B's patient", async () => {
    const tenant = getTenantDb(a.clinic.id);
    await expect(
      tenant.appointment.create({
        data: {
          branchId: a.branch.id,
          providerId: a.provider.id,
          serviceId: a.service.id,
          patientId: b.patient.id, // foreign patient
          startAt: new Date("2030-01-08T05:00:00Z"),
          endAt: new Date("2030-01-08T05:15:00Z"),
        } as never,
      }),
    ).rejects.toThrow();
  });

  it("database rejects an appointment with another clinic's provider", async () => {
    await expect(
      db.appointment.create({
        data: {
          clinicId: a.clinic.id,
          branchId: a.branch.id,
          providerId: b.provider.id, // foreign provider
          serviceId: a.service.id,
          patientId: a.patient.id,
          startAt: new Date("2030-01-09T05:00:00Z"),
          endAt: new Date("2030-01-09T05:15:00Z"),
        },
      }),
    ).rejects.toThrow();
  });
});

describe("shared models", () => {
  it("tenants see national holidays and their own, not other clinics'", async () => {
    await db.holiday.createMany({
      data: [
        { date: new Date("2030-08-14T00:00:00Z"), name: "Independence Day" },
        { clinicId: a.clinic.id, date: new Date("2030-02-01T00:00:00Z"), name: "Alpha closure" },
        { clinicId: b.clinic.id, date: new Date("2030-02-02T00:00:00Z"), name: "Beta closure" },
      ],
    });
    const names = (
      await getTenantDb(a.clinic.id).holiday.findMany({ orderBy: { date: "asc" } })
    ).map((h) => h.name);
    expect(names).toEqual(["Alpha closure", "Independence Day"]);
  });

  it("tenants can't delete national holidays", async () => {
    const result = await getTenantDb(a.clinic.id).holiday.deleteMany({
      where: { name: "Independence Day" },
    });
    expect(result.count).toBe(0);
  });
});

describe("audit log", () => {
  it("is append-only", async () => {
    const entry = await db.auditLog.create({
      data: {
        clinicId: a.clinic.id,
        action: "patient.view",
        entity: "Patient",
        entityId: a.patient.id,
      },
    });
    await expect(
      db.auditLog.update({ where: { id: entry.id }, data: { action: "x" } }),
    ).rejects.toThrow(/append-only/);
    await expect(db.auditLog.delete({ where: { id: entry.id } })).rejects.toThrow(/append-only/);
  });

  it("is invisible to other clinics", async () => {
    expect(await getTenantDb(b.clinic.id).auditLog.count()).toBe(0);
  });
});
