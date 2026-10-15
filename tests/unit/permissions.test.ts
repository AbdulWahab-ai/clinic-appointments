import { describe, expect, it } from "vitest";
import { PERMISSIONS, ROLE_PERMISSIONS, type Role } from "@/server/authz/permissions";
import { can, ForbiddenError, requirePermission } from "@/server/authz/require";
import type { StaffContext } from "@/server/tenancy/context";

function ctx(role: Role, extra: Partial<StaffContext> = {}): StaffContext {
  return {
    userId: "u1",
    clinicId: "c1",
    clinicSlug: "shifa",
    membershipId: "m1",
    role,
    branchIds: [],
    providerId: null,
    isSuperAdmin: false,
    ...extra,
  };
}

describe("permission matrix", () => {
  it("only references known permissions", () => {
    for (const set of Object.values(ROLE_PERMISSIONS)) {
      for (const p of set) expect(PERMISSIONS).toContain(p);
    }
  });

  it("keeps clinical content away from admins and reception", () => {
    expect(can(ctx("DOCTOR"), "patient.clinical.view")).toBe(true);
    expect(can(ctx("CLINIC_ADMIN"), "patient.clinical.view")).toBe(false);
    expect(can(ctx("RECEPTIONIST"), "patient.clinical.view")).toBe(false);
  });

  it("reserves clinic settings, staff and reports for admins", () => {
    for (const p of [
      "clinic.settings.manage",
      "staff.manage",
      "report.view",
      "audit.view",
    ] as const) {
      expect(can(ctx("CLINIC_ADMIN"), p)).toBe(true);
      expect(can(ctx("RECEPTIONIST"), p)).toBe(false);
      expect(can(ctx("DOCTOR"), p)).toBe(false);
    }
  });

  it("lets reception book and take payments but not manage services", () => {
    const r = ctx("RECEPTIONIST");
    expect(can(r, "appointment.create")).toBe(true);
    expect(can(r, "payment.collect")).toBe(true);
    expect(can(r, "service.manage")).toBe(false);
  });
});

describe("branch scoping", () => {
  const reception = ctx("RECEPTIONIST", { branchIds: ["gulberg"] });

  it("allows the member's own branch", () => {
    expect(can(reception, "appointment.create", { branchId: "gulberg" })).toBe(true);
  });

  it("blocks other branches", () => {
    expect(can(reception, "appointment.create", { branchId: "clifton" })).toBe(false);
  });

  it("treats an empty branch list as all branches", () => {
    expect(can(ctx("RECEPTIONIST"), "appointment.create", { branchId: "clifton" })).toBe(true);
  });
});

describe("own-scoped permissions", () => {
  const doctor = ctx("DOCTOR", { providerId: "p1" });

  it("allows a doctor to update their own appointments", () => {
    expect(can(doctor, "appointment.update", { providerId: "p1" })).toBe(true);
    expect(can(doctor, "availability.manage", { providerId: "p1" })).toBe(true);
  });

  it("blocks another doctor's appointments and untargeted checks", () => {
    expect(can(doctor, "appointment.update", { providerId: "p2" })).toBe(false);
    expect(can(doctor, "appointment.update")).toBe(false);
  });

  it("does not let a doctor without a provider profile match null", () => {
    expect(can(ctx("DOCTOR"), "appointment.update", { providerId: null })).toBe(false);
  });
});

describe("requirePermission", () => {
  it("throws a 403 ForbiddenError", () => {
    try {
      requirePermission(ctx("DOCTOR"), "staff.manage");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenError);
      expect((error as ForbiddenError).status).toBe(403);
    }
  });

  it("lets super admins through", () => {
    expect(() =>
      requirePermission(ctx("DOCTOR", { isSuperAdmin: true }), "staff.manage"),
    ).not.toThrow();
  });
});
