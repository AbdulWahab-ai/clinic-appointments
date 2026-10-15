import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getSession } from "@/server/auth/session";
import { systemDb } from "@/server/db/client";
import type { StaffContext } from "./context";

export const getClinicBySlug = cache(async (slug: string) => {
  return systemDb.clinic.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      nameUr: true,
      logoUrl: true,
      brandColor: true,
      defaultLocale: true,
      currency: true,
      status: true,
    },
  });
});

/**
 * Resolves the signed-in user's staff context for a clinic, or null when they aren't an
 * active member. Super admins get an admin-equivalent context in any clinic.
 */
export const getStaffContext = cache(async (clinicSlug: string): Promise<StaffContext | null> => {
  const [session, clinic] = await Promise.all([getSession(), getClinicBySlug(clinicSlug)]);
  if (!session || !clinic || clinic.status === "SUSPENDED") return null;

  const isSuperAdmin = session.user.isSuperAdmin === true;
  const membership = await systemDb.membership.findUnique({
    where: { userId_clinicId: { userId: session.user.id, clinicId: clinic.id } },
    select: {
      id: true,
      role: true,
      branchIds: true,
      status: true,
      provider: { select: { id: true } },
    },
  });

  if (membership && membership.status === "ACTIVE") {
    return {
      userId: session.user.id,
      clinicId: clinic.id,
      clinicSlug: clinic.slug,
      membershipId: membership.id,
      role: membership.role,
      branchIds: membership.branchIds,
      providerId: membership.provider?.id ?? null,
      isSuperAdmin,
    };
  }

  if (isSuperAdmin) {
    return {
      userId: session.user.id,
      clinicId: clinic.id,
      clinicSlug: clinic.slug,
      membershipId: "super-admin",
      role: "CLINIC_ADMIN",
      branchIds: [],
      providerId: null,
      isSuperAdmin: true,
    };
  }
  return null;
});

/**
 * For staff pages: signed-out users go to sign-in; signed-in users who aren't members of
 * this clinic get a 404, so clinic slugs can't be probed for existence.
 */
export async function requireStaffContext(
  clinicSlug: string,
  locale: string,
): Promise<StaffContext> {
  const session = await getSession();
  if (!session) {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/app/${clinicSlug}`)}`);
  }
  const ctx = await getStaffContext(clinicSlug);
  if (!ctx) notFound();
  return ctx;
}

/** Clinics the signed-in user can open in the staff app. */
export async function listStaffClinics(userId: string) {
  return systemDb.membership.findMany({
    where: { userId, status: "ACTIVE", clinic: { status: { not: "SUSPENDED" } } },
    select: { role: true, clinic: { select: { slug: true, name: true, nameUr: true } } },
    orderBy: { createdAt: "asc" },
  });
}
