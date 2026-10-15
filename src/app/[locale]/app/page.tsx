import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { SiteHeader } from "@/components/site-header";
import { Link } from "@/i18n/navigation";
import { getSession } from "@/server/auth/session";
import { listStaffClinics } from "@/server/tenancy/staff";

/** Staff entry point: one clinic → straight in; several → pick; none → patient portal. */
export default async function StaffHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/sign-in`);

  const clinics = await listStaffClinics(session.user.id);
  const isSuperAdmin = session.user.isSuperAdmin === true;
  if (clinics.length === 1 && !isSuperAdmin) redirect(`/${locale}/app/${clinics[0]!.clinic.slug}`);
  if (clinics.length === 0 && !isSuperAdmin) redirect(`/${locale}/portal`);

  const t = await getTranslations("staff");
  const tSuper = await getTranslations("super");

  return (
    <>
      <SiteHeader right={<SignOutButton />} />
      <main id="main" className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-bold">{t("chooseClinic")}</h1>
        <ul className="bg-card mt-6 divide-y rounded-lg border">
          {clinics.map(({ clinic, role }) => (
            <li key={clinic.slug}>
              <Link
                href={`/app/${clinic.slug}`}
                className="hover:bg-accent flex items-center justify-between gap-4 px-4 py-3"
              >
                <span className="font-medium">
                  {locale === "ur" && clinic.nameUr ? clinic.nameUr : clinic.name}
                </span>
                <span className="text-muted-foreground text-sm">{t(`role.${role}`)}</span>
              </Link>
            </li>
          ))}
          {isSuperAdmin && (
            <li>
              <Link href="/super" className="hover:bg-accent block px-4 py-3 font-medium">
                {tSuper("title")}
              </Link>
            </li>
          )}
        </ul>
      </main>
    </>
  );
}
