import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { StaffNav } from "@/components/staff-nav";
import { getClinicBySlug, requireStaffContext } from "@/server/tenancy/staff";

export default async function StaffLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; clinicSlug: string }>;
}) {
  const { locale, clinicSlug } = await params;
  setRequestLocale(locale);
  const ctx = await requireStaffContext(clinicSlug, locale);
  const clinic = (await getClinicBySlug(clinicSlug))!;
  const t = await getTranslations("staff");
  const name = locale === "ur" && clinic.nameUr ? clinic.nameUr : clinic.name;

  return (
    <div
      className="brand-scope grid min-h-dvh md:grid-cols-[15rem_1fr]"
      style={{ ["--brand" as string]: clinic.brandColor }}
    >
      <aside className="bg-card flex flex-col border-b md:border-e md:border-b-0">
        <div className="px-4 py-4">
          <span className="font-bold">{name}</span>
        </div>
        <StaffNav clinicSlug={clinicSlug} />
        {/* Phones: a compact row under the nav. Desktop: pinned to the sidebar's foot. */}
        <div className="mt-2 flex items-center justify-between gap-2 border-t px-4 py-2 text-sm md:mt-auto md:flex-col md:items-stretch md:py-4">
          <span className="text-muted-foreground">{t(`role.${ctx.role}`)}</span>
          <div className="flex items-center justify-between gap-2">
            <Suspense>
              <LocaleSwitcher />
            </Suspense>
            <SignOutButton />
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
