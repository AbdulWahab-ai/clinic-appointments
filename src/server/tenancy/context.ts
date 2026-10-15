import type { Role } from "@/server/authz/permissions";

/**
 * Who is acting, and in which clinic. Resolved once per request (see ./staff.ts) and
 * passed explicitly to every service. Services never read cookies or headers themselves.
 */
export interface StaffContext {
  userId: string;
  clinicId: string;
  clinicSlug: string;
  membershipId: string;
  role: Role;
  /** Empty = every branch. */
  branchIds: string[];
  /** Set when the staff member is a doctor with a provider profile. */
  providerId: string | null;
  /** Platform operator acting inside a clinic. */
  isSuperAdmin: boolean;
}
