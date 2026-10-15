import { randomUUID } from "node:crypto";
import { systemDb } from "@/server/db/client";

export const db = systemDb;

/** Empties every table in the test database. */
export async function resetDb() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  await db.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables.map((t) => `"public"."${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
}

/** A minimal clinic: one branch, provider, service, patient and appointment. */
export async function createClinicFixture(slug: string) {
  const clinic = await db.clinic.create({ data: { slug, name: `Clinic ${slug}` } });
  const branch = await db.branch.create({ data: { clinicId: clinic.id, name: `${slug} main` } });
  const provider = await db.provider.create({
    data: { clinicId: clinic.id, displayName: `Dr ${slug}` },
  });
  const service = await db.service.create({
    data: { clinicId: clinic.id, name: "Consultation", durationMin: 15, price: 200000 },
  });
  const patient = await db.patient.create({
    data: {
      clinicId: clinic.id,
      mrNumber: `${slug}-1`,
      name: `Patient of ${slug}`,
      phone: "+923000000001",
    },
  });
  const startAt = new Date("2030-01-07T05:00:00Z");
  const endAt = new Date("2030-01-07T05:15:00Z");
  const appointment = await db.appointment.create({
    data: {
      clinicId: clinic.id,
      branchId: branch.id,
      providerId: provider.id,
      serviceId: service.id,
      patientId: patient.id,
      startAt,
      endAt,
    },
  });
  const user = await db.user.create({
    data: { id: randomUUID(), email: `admin@${slug}.test`, name: `Admin ${slug}` },
  });
  const membership = await db.membership.create({
    data: { clinicId: clinic.id, userId: user.id, role: "CLINIC_ADMIN" },
  });
  return { clinic, branch, provider, service, patient, appointment, user, membership };
}
