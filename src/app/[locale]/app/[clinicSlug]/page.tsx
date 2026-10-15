import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/server/auth/session";
import { getClinicBySlug, requireStaffContext } from "@/server/tenancy/staff";

export default async function StaffToday({
  params,
}: {
  params: Promise<{ locale: string; clinicSlug: string }>;
}) {
  const { locale, clinicSlug } = await params;
  setRequestLocale(locale);
  const ctx = await requireStaffContext(clinicSlug, locale);
  const [clinic, session] = await Promise.all([getClinicBySlug(clinicSlug), getSession()]);
  const t = await getTranslations("staff");
  const name = locale === "ur" && clinic?.nameUr ? clinic.nameUr : clinic?.name;

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold">{t("todayTitle", { clinic: name ?? "" })}</h1>
      <p className="text-muted-foreground mt-2">
        {t("signedInAs", { name: session?.user.name ?? "" })}
      </p>
      <p className="text-muted-foreground">{t(`role.${ctx.role}`)}</p>
      <p className="mt-8 max-w-[40rem]">{t("todayEmpty")}</p>
    </div>
  );
}
