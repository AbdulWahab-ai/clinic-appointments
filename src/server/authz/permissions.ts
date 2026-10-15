/**
 * Role → permission matrix. This is the single source of truth for what staff can do;
 * services call requirePermission() with one of these before touching data.
 *
 * Health-data principle: clinical content (visit notes, intake answers, uploaded reports)
 * is visible to doctors only. Admins and reception see demographics and schedules.
 */
export const PERMISSIONS = [
  "clinic.settings.manage",
  "branch.manage",
  "staff.manage",
  "service.manage",
  "provider.manage",
  "resource.manage",
  "availability.manage",
  "availability.manage.own",
  "appointment.view",
  "appointment.create",
  "appointment.update",
  "appointment.update.own",
  "appointment.cancel",
  "patient.view",
  "patient.create",
  "patient.update",
  "patient.clinical.view",
  "queue.manage",
  "payment.collect",
  "report.view",
  "audit.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type Role = "CLINIC_ADMIN" | "RECEPTIONIST" | "DOCTOR";

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  CLINIC_ADMIN: new Set<Permission>([
    "clinic.settings.manage",
    "branch.manage",
    "staff.manage",
    "service.manage",
    "provider.manage",
    "resource.manage",
    "availability.manage",
    "appointment.view",
    "appointment.create",
    "appointment.update",
    "appointment.cancel",
    "patient.view",
    "patient.create",
    "patient.update",
    "queue.manage",
    "payment.collect",
    "report.view",
    "audit.view",
  ]),
  RECEPTIONIST: new Set<Permission>([
    "availability.manage",
    "appointment.view",
    "appointment.create",
    "appointment.update",
    "appointment.cancel",
    "patient.view",
    "patient.create",
    "patient.update",
    "queue.manage",
    "payment.collect",
  ]),
  DOCTOR: new Set<Permission>([
    "availability.manage.own",
    "appointment.view",
    "appointment.update.own",
    "patient.view",
    "patient.clinical.view",
    "queue.manage",
  ]),
};

export function roleHas(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}
