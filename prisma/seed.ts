/**
 * Demo data: `pnpm db:seed`. Wipes every table first (refuses to run in production).
 *
 * - Platform super admin
 * - "Shifa Family Clinic": 2 branches (Lahore, Karachi), 6 doctors, services, rooms,
 *   weekly schedules, national holidays, 40 patients, appointments for the past and
 *   next 7 days
 * - "Al-Noor Medical Centre": a small second clinic, used to prove tenant isolation
 *
 * Every demo account uses SEED_PASSWORD (default in .env.example).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { DateTime } from "luxon";
import { randomUUID } from "node:crypto";
import {
  PrismaClient,
  type AppointmentStatus,
  type Gender,
  type ResourceType,
  type StaffRole,
} from "../src/generated/prisma/client";
import { ClinicSettingsSchema } from "../src/lib/clinic-settings";

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed a production database");
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
const PASSWORD = process.env.SEED_PASSWORD ?? "Demo-Clinic-2026!";
const ZONE = "Asia/Karachi";

// Deterministic PRNG so every seed run produces the same schedule.
let rngState = 20261015;
function rand() {
  rngState = (rngState * 1664525 + 1013904223) % 2 ** 32;
  return rngState / 2 ** 32;
}
const pick = <T>(items: readonly T[]) => items[Math.floor(rand() * items.length)]!;

const rs = (rupees: number) => rupees * 100; // PKR → paisa

async function wipe() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

const passwordHash = await hashPassword(PASSWORD);

async function createUser(input: {
  email: string;
  name: string;
  phone?: string;
  isSuperAdmin?: boolean;
  locale?: string;
}) {
  const id = randomUUID();
  return db.user.create({
    data: {
      id,
      email: input.email,
      name: input.name,
      emailVerified: true,
      phoneNumber: input.phone,
      phoneNumberVerified: input.phone ? true : null,
      isSuperAdmin: input.isSuperAdmin ?? false,
      locale: input.locale ?? "en",
      accounts: {
        create: {
          id: randomUUID(),
          accountId: id,
          providerId: "credential",
          password: passwordHash,
        },
      },
    },
  });
}

async function createStaff(
  clinicId: string,
  email: string,
  name: string,
  role: StaffRole,
  branchIds: string[] = [],
) {
  const user = await createUser({ email, name });
  return db.membership.create({ data: { clinicId, userId: user.id, role, branchIds } });
}

/** Local wall-clock (branch zone) → UTC Date. */
const at = (date: DateTime, minuteOfDay: number) =>
  date.setZone(ZONE).startOf("day").plus({ minutes: minuteOfDay }).toUTC().toJSDate();

const H = (h: number, m = 0) => h * 60 + m;

async function main() {
  await wipe();
  const settings = ClinicSettingsSchema.parse({});

  // ------------------------------------------------------------ platform
  const plan = await db.plan.create({
    data: { name: "Starter", limits: { branches: 5, providers: 25 } },
  });
  await createUser({ email: "super@platform.test", name: "Platform Admin", isSuperAdmin: true });

  const specialties = Object.fromEntries(
    await Promise.all(
      (
        [
          ["general-medicine", "General medicine", "جنرل میڈیسن"],
          ["pediatrics", "Pediatrics", "امراضِ اطفال"],
          ["gynecology", "Gynecology", "امراضِ نسواں"],
          ["cardiology", "Cardiology", "امراضِ قلب"],
          ["dermatology", "Dermatology", "امراضِ جلد"],
          ["physiotherapy", "Physiotherapy", "فزیوتھراپی"],
        ] as const
      ).map(async ([slug, name, nameUr]) => [
        slug,
        await db.specialty.create({ data: { slug, name, nameUr } }),
      ]),
    ),
  );

  // Fixed-date national holidays. Lunar holidays (Eid, Ashura, Mawlid) change every year;
  // clinic admins add them once the dates are announced.
  const nationalHolidays: [string, string, string][] = [
    ["2026-11-09", "Iqbal Day", "یومِ اقبال"],
    ["2026-12-25", "Quaid-e-Azam Day", "یومِ قائدِ اعظم"],
    ["2027-02-05", "Kashmir Solidarity Day", "یومِ یکجہتیٔ کشمیر"],
    ["2027-03-23", "Pakistan Day", "یومِ پاکستان"],
    ["2027-05-01", "Labour Day", "یومِ مزدور"],
    ["2027-08-14", "Independence Day", "یومِ آزادی"],
  ];
  await db.holiday.createMany({
    data: nationalHolidays.map(([date, name, nameUr]) => ({
      date: new Date(`${date}T00:00:00Z`),
      name,
      nameUr,
    })),
  });

  // ------------------------------------------------------------ clinic A
  const shifa = await db.clinic.create({
    data: {
      slug: "shifa-family",
      name: "Shifa Family Clinic",
      nameUr: "شفا فیملی کلینک",
      brandColor: "#0e5a43",
      planId: plan.id,
      settings,
    },
  });
  const gulberg = await db.branch.create({
    data: {
      clinicId: shifa.id,
      name: "Gulberg, Lahore",
      nameUr: "گلبرگ، لاہور",
      city: "Lahore",
      address: "42-C Main Boulevard, Gulberg III, Lahore",
      lat: 31.5204,
      lng: 74.3587,
      phone: "+924235700000",
    },
  });
  const clifton = await db.branch.create({
    data: {
      clinicId: shifa.id,
      name: "Clifton, Karachi",
      nameUr: "کلفٹن، کراچی",
      city: "Karachi",
      address: "Block 5, Clifton, Karachi",
      lat: 24.8138,
      lng: 67.0299,
      phone: "+922135800000",
    },
  });

  await createStaff(shifa.id, "admin@shifa.test", "Nadia Hussain", "CLINIC_ADMIN");
  await createStaff(shifa.id, "reception@shifa.test", "Usman Tariq", "RECEPTIONIST", [gulberg.id]);
  await createStaff(shifa.id, "reception.khi@shifa.test", "Farah Shaikh", "RECEPTIONIST", [
    clifton.id,
  ]);

  const resources = async (branchId: string, list: [ResourceType, string][]) =>
    Promise.all(
      list.map(([type, name]) =>
        db.resource.create({ data: { clinicId: shifa.id, branchId, type, name } }),
      ),
    );
  await resources(gulberg.id, [
    ["ROOM", "Procedure room 1"],
    ["ROOM", "Physio room"],
    ["EQUIPMENT", "Laser unit"],
  ]);
  await resources(clifton.id, [["ROOM", "Procedure room"]]);

  const service = (data: {
    name: string;
    nameUr: string;
    durationMin: number;
    price: number;
    bufferBeforeMin?: number;
    bufferAfterMin?: number;
    isVideo?: boolean;
    requiredResourceTypes?: ResourceType[];
    paymentMode?: "FREE" | "AT_CLINIC" | "DEPOSIT" | "PREPAY";
  }) => db.service.create({ data: { clinicId: shifa.id, ...data } });

  const consultation = await service({
    name: "Consultation",
    nameUr: "معائنہ",
    durationMin: 15,
    price: rs(2000),
  });
  const followUp = await service({
    name: "Follow-up visit",
    nameUr: "دوبارہ معائنہ",
    durationMin: 10,
    price: rs(1000),
  });
  const video = await service({
    name: "Video consultation",
    nameUr: "ویڈیو معائنہ",
    durationMin: 15,
    price: rs(1800),
    isVideo: true,
    paymentMode: "PREPAY",
  });
  const physio = await service({
    name: "Physiotherapy session",
    nameUr: "فزیوتھراپی سیشن",
    durationMin: 45,
    bufferAfterMin: 15,
    price: rs(3500),
    requiredResourceTypes: ["ROOM"],
  });
  const laser = await service({
    name: "Laser skin treatment",
    nameUr: "لیزر جلدی علاج",
    durationMin: 45,
    bufferBeforeMin: 5,
    bufferAfterMin: 10,
    price: rs(12000),
    requiredResourceTypes: ["ROOM", "EQUIPMENT"],
    paymentMode: "DEPOSIT",
  });

  type DoctorSeed = {
    email: string;
    name: string;
    nameUr: string;
    gender: Gender;
    specialty: keyof typeof specialties;
    branches: string[];
    fee: number;
    languages: string[];
    services: string[];
    token?: boolean;
    qualifications: string;
    /** [weekday 1-7, start, end] per branch */
    shifts: { branchId: string; days: number[]; start: number; end: number }[];
  };

  const MON_SAT = [1, 2, 3, 4, 5, 6];
  const MON_THU_SAT = [1, 2, 3, 4, 6];
  const doctors: DoctorSeed[] = [
    {
      email: "dr.ayesha@shifa.test",
      name: "Dr. Ayesha Khan",
      nameUr: "ڈاکٹر عائشہ خان",
      gender: "FEMALE",
      specialty: "general-medicine",
      branches: [gulberg.id],
      fee: rs(2000),
      languages: ["ur", "en", "pa"],
      services: [consultation.id, followUp.id, video.id],
      token: true,
      qualifications: "MBBS, FCPS (Medicine)",
      shifts: [
        { branchId: gulberg.id, days: MON_THU_SAT, start: H(9), end: H(13) },
        { branchId: gulberg.id, days: [5], start: H(9), end: H(12, 30) },
        { branchId: gulberg.id, days: MON_SAT, start: H(17), end: H(21) },
      ],
    },
    {
      email: "dr.bilal@shifa.test",
      name: "Dr. Bilal Ahmed",
      nameUr: "ڈاکٹر بلال احمد",
      gender: "MALE",
      specialty: "pediatrics",
      branches: [gulberg.id, clifton.id],
      fee: rs(2500),
      languages: ["ur", "en"],
      services: [consultation.id, followUp.id, video.id],
      qualifications: "MBBS, DCH, FCPS (Paeds)",
      shifts: [
        { branchId: gulberg.id, days: [1, 3, 5], start: H(10), end: H(14) },
        { branchId: clifton.id, days: [2, 4, 6], start: H(16), end: H(20) },
      ],
    },
    {
      email: "dr.sana@shifa.test",
      name: "Dr. Sana Malik",
      nameUr: "ڈاکٹر ثنا ملک",
      gender: "FEMALE",
      specialty: "gynecology",
      branches: [clifton.id],
      fee: rs(3000),
      languages: ["ur", "en", "sd"],
      services: [consultation.id, followUp.id],
      qualifications: "MBBS, FCPS (Obs & Gynae)",
      shifts: [{ branchId: clifton.id, days: MON_SAT, start: H(11), end: H(15) }],
    },
    {
      email: "dr.imran@shifa.test",
      name: "Dr. Imran Qureshi",
      nameUr: "ڈاکٹر عمران قریشی",
      gender: "MALE",
      specialty: "cardiology",
      branches: [clifton.id],
      fee: rs(4000),
      languages: ["ur", "en"],
      services: [consultation.id, followUp.id, video.id],
      qualifications: "MBBS, FCPS (Cardiology), FACC",
      shifts: [{ branchId: clifton.id, days: [1, 2, 3, 4], start: H(18), end: H(22) }],
    },
    {
      email: "dr.hira@shifa.test",
      name: "Dr. Hira Siddiqui",
      nameUr: "ڈاکٹر حرا صدیقی",
      gender: "FEMALE",
      specialty: "dermatology",
      branches: [gulberg.id],
      fee: rs(3000),
      languages: ["ur", "en"],
      services: [consultation.id, followUp.id, laser.id],
      qualifications: "MBBS, FCPS (Dermatology)",
      shifts: [{ branchId: gulberg.id, days: [2, 4, 6], start: H(15), end: H(19) }],
    },
    {
      email: "ali.raza@shifa.test",
      name: "Ali Raza, DPT",
      nameUr: "علی رضا، ڈی پی ٹی",
      gender: "MALE",
      specialty: "physiotherapy",
      branches: [gulberg.id],
      fee: rs(3500),
      languages: ["ur", "pa"],
      services: [physio.id],
      qualifications: "DPT, MS (Sports Physiotherapy)",
      shifts: [{ branchId: gulberg.id, days: MON_SAT, start: H(9), end: H(15) }],
    },
  ];

  const today = DateTime.now().setZone(ZONE).startOf("day");
  const effectiveFrom = new Date(`${today.minus({ days: 30 }).toISODate()}T00:00:00Z`);
  const createdProviders: { id: string; seed: DoctorSeed }[] = [];

  for (const d of doctors) {
    const membership = await createStaff(shifa.id, d.email, d.name, "DOCTOR", d.branches);
    const provider = await db.provider.create({
      data: {
        clinicId: shifa.id,
        membershipId: membership.id,
        displayName: d.name,
        displayNameUr: d.nameUr,
        gender: d.gender,
        languages: d.languages,
        qualifications: d.qualifications,
        defaultFee: d.fee,
        bookingMode: d.token ? "TOKEN" : "FIXED_TIME",
        specialties: { connect: { id: specialties[d.specialty]!.id } },
      },
    });
    await db.providerBranch.createMany({
      data: d.branches.map((branchId) => ({
        clinicId: shifa.id,
        providerId: provider.id,
        branchId,
      })),
    });
    await db.providerService.createMany({
      data: d.services.map((serviceId) => ({
        clinicId: shifa.id,
        providerId: provider.id,
        serviceId,
        priceOverride: serviceId === consultation.id ? d.fee : null,
      })),
    });
    await db.availabilityRule.createMany({
      data: d.shifts.flatMap((s) =>
        s.days.map((weekday) => ({
          clinicId: shifa.id,
          providerId: provider.id,
          branchId: s.branchId,
          weekday,
          startMinute: s.start,
          endMinute: s.end,
          effectiveFrom,
        })),
      ),
    });
    createdProviders.push({ id: provider.id, seed: d });
  }

  // Dr. Sana is on leave three days from now.
  const sana = createdProviders.find((p) => p.seed.email === "dr.sana@shifa.test")!;
  await db.availabilityOverride.create({
    data: {
      clinicId: shifa.id,
      providerId: sana.id,
      date: new Date(`${today.plus({ days: 3 }).toISODate()}T00:00:00Z`),
      kind: "BLOCK",
      reason: "Conference",
    },
  });

  // ------------------------------------------------------------ patients
  const firstNames = [
    "Ahmed",
    "Fatima",
    "Hassan",
    "Zainab",
    "Omar",
    "Maryam",
    "Hamza",
    "Amna",
    "Saad",
    "Rabia",
    "Faisal",
    "Iqra",
    "Kashif",
    "Mehwish",
    "Junaid",
    "Sadia",
    "Waqas",
    "Noor",
    "Adeel",
    "Hina",
  ];
  const lastNames = [
    "Butt",
    "Chaudhry",
    "Sheikh",
    "Mirza",
    "Abbasi",
    "Rana",
    "Javed",
    "Baig",
    "Akhtar",
    "Memon",
  ];
  const patients = [];
  for (let i = 1; i <= 40; i++) {
    const name = `${pick(firstNames)} ${pick(lastNames)}`;
    patients.push(
      await db.patient.create({
        data: {
          clinicId: shifa.id,
          mrNumber: `SHF-${String(i).padStart(6, "0")}`,
          name,
          // 0300-00xxxxx: reserved-looking demo range, not real subscribers.
          phone: `+9230000${String(10000 + i).slice(-5)}`,
          gender: rand() > 0.5 ? "FEMALE" : "MALE",
          dateOfBirth: new Date(
            Date.UTC(
              1950 + Math.floor(rand() * 60),
              Math.floor(rand() * 12),
              1 + Math.floor(rand() * 27),
            ),
          ),
          locale: rand() > 0.4 ? "ur" : "en",
        },
      }),
    );
  }
  // A patient with a login and a dependent child.
  const parentUser = await createUser({
    email: "patient@shifa.test",
    name: "Kiran Butt",
    phone: "+923000099999",
  });
  const parent = await db.patient.update({
    where: { id: patients[0]!.id },
    data: { userId: parentUser.id, name: "Kiran Butt" },
  });
  await db.patient.create({
    data: {
      clinicId: shifa.id,
      mrNumber: "SHF-000041",
      name: "Ibrahim Butt",
      guardianPatientId: parent.id,
      gender: "MALE",
      dateOfBirth: new Date(Date.UTC(2019, 4, 12)),
    },
  });

  // ------------------------------------------------------------ appointments
  const services = {
    [consultation.id]: consultation,
    [followUp.id]: followUp,
    [physio.id]: physio,
    [laser.id]: laser,
    [video.id]: video,
  };
  let appointmentCount = 0;
  const now = DateTime.now();

  for (const { id: providerId, seed: d } of createdProviders) {
    const tokenCounters = new Map<string, number>();
    for (let offset = -7; offset <= 7; offset++) {
      const day = today.plus({ days: offset });
      const shifts = d.shifts.filter((s) => s.days.includes(day.weekday));
      if (offset === 3 && providerId === sana.id) continue;

      for (const shift of shifts) {
        let cursor = shift.start;
        while (cursor < shift.end) {
          const serviceId = d.services.includes(physio.id)
            ? physio.id
            : pick(d.services.filter((s) => s !== video.id || rand() > 0.7));
          const svc = services[serviceId]!;
          // cursor = first free minute. The buffer before sits between it and the start.
          const start = cursor + svc.bufferBeforeMin;
          const end = start + svc.durationMin;
          const occupiedEnd = end + svc.bufferAfterMin;
          if (end > shift.end) break;

          if (rand() < 0.55) {
            const startAt = at(day, start);
            const endAt = at(day, end);
            const isPast = DateTime.fromJSDate(endAt) < now;
            const roll = rand();
            const status: AppointmentStatus = isPast
              ? roll < 0.8
                ? "COMPLETED"
                : roll < 0.9
                  ? "NO_SHOW"
                  : "CANCELLED"
              : roll < 0.6
                ? "CONFIRMED"
                : roll < 0.95
                  ? "BOOKED"
                  : "CANCELLED";
            const patient = pick(patients);
            const dayKey = `${day.toISODate()}`;
            const token = d.token ? (tokenCounters.get(dayKey) ?? 0) + 1 : null;
            if (token) tokenCounters.set(dayKey, token);

            const appointment = await db.appointment.create({
              data: {
                clinicId: shifa.id,
                branchId: shift.branchId,
                providerId,
                serviceId,
                patientId: patient.id,
                startAt,
                endAt,
                status,
                source: pick(["WEB", "WEB", "DESK", "WALK_IN"] as const),
                isVideo: svc.isVideo,
                tokenNumber: token,
                price: serviceId === consultation.id ? d.fee : svc.price,
                cancelledAt: status === "CANCELLED" ? startAt : null,
                cancelReason: status === "CANCELLED" ? "Patient request" : null,
                statusHistory: {
                  create: [
                    {
                      clinicId: shifa.id,
                      toStatus: "BOOKED",
                      at: DateTime.fromJSDate(startAt).minus({ days: 2 }).toJSDate(),
                    },
                    ...(status !== "BOOKED"
                      ? [{ clinicId: shifa.id, fromStatus: "BOOKED" as const, toStatus: status }]
                      : []),
                  ],
                },
              },
            });
            // Cancelled appointments free their slot, so they hold no reservation.
            if (status !== "CANCELLED") {
              await db.reservation.create({
                data: {
                  clinicId: shifa.id,
                  providerId,
                  kind: "APPOINTMENT",
                  appointmentId: appointment.id,
                  occupiedStart: at(day, cursor),
                  occupiedEnd: at(day, occupiedEnd),
                },
              });
            }
            appointmentCount++;
          }
          cursor = occupiedEnd;
        }
      }
    }
  }

  // ------------------------------------------------------------ clinic B (isolation)
  const alNoor = await db.clinic.create({
    data: {
      slug: "al-noor",
      name: "Al-Noor Medical Centre",
      nameUr: "النور میڈیکل سینٹر",
      brandColor: "#1d4e89",
      planId: plan.id,
      settings,
    },
  });
  const blueArea = await db.branch.create({
    data: { clinicId: alNoor.id, name: "Blue Area, Islamabad", city: "Islamabad", timezone: ZONE },
  });
  await createStaff(alNoor.id, "admin@alnoor.test", "Tahir Mehmood", "CLINIC_ADMIN");
  const alNoorDoctorMembership = await createStaff(
    alNoor.id,
    "dr.zara@alnoor.test",
    "Dr. Zara Naqvi",
    "DOCTOR",
  );
  const zara = await db.provider.create({
    data: {
      clinicId: alNoor.id,
      membershipId: alNoorDoctorMembership.id,
      displayName: "Dr. Zara Naqvi",
      gender: "FEMALE",
      defaultFee: rs(2500),
      specialties: { connect: { id: specialties["general-medicine"]!.id } },
    },
  });
  await db.providerBranch.create({
    data: { clinicId: alNoor.id, providerId: zara.id, branchId: blueArea.id },
  });
  const alNoorConsult = await db.service.create({
    data: { clinicId: alNoor.id, name: "Consultation", durationMin: 20, price: rs(2500) },
  });
  for (let i = 1; i <= 3; i++) {
    const p = await db.patient.create({
      data: {
        clinicId: alNoor.id,
        mrNumber: `ANM-${String(i).padStart(5, "0")}`,
        name: `Al-Noor Patient ${i}`,
        phone: `+9230001000${i}`,
      },
    });
    const startAt = at(today.plus({ days: i }), H(10));
    const endAt = at(today.plus({ days: i }), H(10, 20));
    const a = await db.appointment.create({
      data: {
        clinicId: alNoor.id,
        branchId: blueArea.id,
        providerId: zara.id,
        serviceId: alNoorConsult.id,
        patientId: p.id,
        startAt,
        endAt,
        status: "CONFIRMED",
        price: rs(2500),
      },
    });
    await db.reservation.create({
      data: {
        clinicId: alNoor.id,
        providerId: zara.id,
        kind: "APPOINTMENT",
        appointmentId: a.id,
        occupiedStart: startAt,
        occupiedEnd: endAt,
      },
    });
  }

  console.log(
    `Seeded: 2 clinics, ${createdProviders.length + 1} providers, ${appointmentCount + 3} appointments.`,
  );
  console.log(`Demo password for every account: ${PASSWORD}`);
  console.log(
    "Accounts: super@platform.test, admin@shifa.test, reception@shifa.test, dr.ayesha@shifa.test, patient@shifa.test, admin@alnoor.test",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
