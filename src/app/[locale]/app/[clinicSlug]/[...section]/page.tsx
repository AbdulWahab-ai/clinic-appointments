import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireStaffContext } from "@/server/tenancy/staff";

/** Placeholder for staff screens built in later phases (calendar, queue, patients…). */
export default async function StaffComingSoon({
  params,
}: {
  params: Promise<{ locale: string; clinicSlug: string }>;
}) {
  const { locale, clinicSlug } = await params;
  setRequestLocale(locale);
  await requireStaffContext(clinicSlug, locale);
  const t = await getTranslations("staff");
  return <p className="text-muted-foreground">{t("comingSoon")}</p>;
}
