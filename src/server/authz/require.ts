import { roleHas, type Permission } from "./permissions";
import type { StaffContext } from "@/server/tenancy/context";

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(
    readonly permission: Permission,
    reason: string,
  ) {
    super(`Forbidden: ${permission} (${reason})`);
    this.name = "ForbiddenError";
  }
}

export interface PermissionTarget {
  /** Branch the data belongs to. Checked against the membership's branch list. */
  branchId?: string | null;
  /** Provider the data belongs to. Needed for ".own" permissions. */
  providerId?: string | null;
}

/**
 * Checks a staff member may perform `permission` on `target`. A ".own" permission is
 * satisfied when the target belongs to the staff member's own provider profile; the
 * broader permission (without ".own") satisfies it too.
 */
export function can(
  ctx: StaffContext,
  permission: Permission,
  target: PermissionTarget = {},
): boolean {
  if (ctx.isSuperAdmin) return true;
  if (target.branchId && ctx.branchIds.length > 0 && !ctx.branchIds.includes(target.branchId)) {
    return false;
  }
  if (roleHas(ctx.role, permission)) return true;

  const ownVariant = `${permission}.own` as Permission;
  if (roleHas(ctx.role, ownVariant)) {
    return !!target.providerId && target.providerId === ctx.providerId;
  }
  return false;
}

export function requirePermission(
  ctx: StaffContext,
  permission: Permission,
  target: PermissionTarget = {},
): void {
  if (!can(ctx, permission, target)) {
    throw new ForbiddenError(permission, `role ${ctx.role} in clinic ${ctx.clinicId}`);
  }
}
