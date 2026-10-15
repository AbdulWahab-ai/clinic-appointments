import { z } from "zod";

/**
 * Shape of Clinic.settings (JSON column). Parsed with defaults on every read, so new
 * settings can be added without a data migration.
 */
export const ClinicSettingsSchema = z.object({
  booking: z
    .object({
      /** Earliest bookable slot, in minutes from now. */
      minNoticeMinutes: z.number().int().min(0).default(120),
      /** How far ahead patients can book. */
      horizonDays: z.number().int().min(1).max(365).default(60),
      /** Checkout hold length. */
      holdMinutes: z.number().int().min(1).max(60).default(10),
      /** Patients can't self-cancel within this many hours of the start. */
      cancelCutoffHours: z.number().int().min(0).default(4),
      /** Slot grid step for fixed-time booking. */
      slotStepMinutes: z.number().int().min(5).max(120).default(15),
      autoConfirm: z.boolean().default(true),
    })
    .default({
      minNoticeMinutes: 120,
      horizonDays: 60,
      holdMinutes: 10,
      cancelCutoffHours: 4,
      slotStepMinutes: 15,
      autoConfirm: true,
    }),
  reminders: z
    .object({
      /** Minutes before start. */
      offsetsMinutes: z.array(z.number().int().positive()).default([1440, 120]),
      quietHours: z
        .object({
          start: z.string().regex(/^\d{2}:\d{2}$/),
          end: z.string().regex(/^\d{2}:\d{2}$/),
        })
        .default({ start: "22:00", end: "08:00" }),
    })
    .default({ offsetsMinutes: [1440, 120], quietHours: { start: "22:00", end: "08:00" } }),
  languages: z
    .array(z.enum(["en", "ur"]))
    .min(1)
    .default(["en", "ur"]),
});

export type ClinicSettings = z.infer<typeof ClinicSettingsSchema>;

export function parseClinicSettings(raw: unknown): ClinicSettings {
  return ClinicSettingsSchema.parse(raw ?? {});
}
