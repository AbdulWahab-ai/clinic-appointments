/**
 * Models owned by a single clinic. Every query on these goes through the tenant scope in
 * ./tenant.ts, which injects `clinicId`. tests/unit/tenant-models.test.ts fails if a model
 * with a required `clinicId` column is missing here.
 */
export const TENANT_MODELS = [
  "Membership",
  "StaffInvite",
  "Branch",
  "Provider",
  "ProviderBranch",
  "Service",
  "ProviderService",
  "Resource",
  "AvailabilityRule",
  "AvailabilityOverride",
  "Patient",
  "Appointment",
  "AppointmentStatusHistory",
  "Reservation",
  "ResourceReservation",
  // clinicId is optional (platform actions have none), but tenants only ever see their own.
  "AuditLog",
] as const;

/**
 * Models with an optional clinicId: rows are either clinic-owned or platform-wide.
 * Tenant reads see their own rows plus platform rows (clinicId = null); writes always
 * stamp the tenant's clinicId.
 */
export const SHARED_MODELS = ["Holiday", "FeatureFlag"] as const;

/** Models with no clinicId at all (platform or auth tables). */
export const GLOBAL_MODELS = [
  "Plan",
  "Clinic",
  "Specialty",
  "DevOutboxMessage",
  "User",
  "Session",
  "Account",
  "Verification",
  "TwoFactor",
] as const;

export type TenantModel = (typeof TENANT_MODELS)[number];
export type SharedModel = (typeof SHARED_MODELS)[number];

const tenantSet = new Set<string>(TENANT_MODELS);
const sharedSet = new Set<string>(SHARED_MODELS);

export const isTenantModel = (model: string): model is TenantModel => tenantSet.has(model);
export const isSharedModel = (model: string): model is SharedModel => sharedSet.has(model);
