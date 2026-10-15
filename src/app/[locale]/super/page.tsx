import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { SiteHeader } from "@/components/site-header";
import { Link } from "@/i18n/navigation";
import { getSession } from "@/server/auth/session";
import { systemDb } from "@/server/db/client";

/** Platform admin. Cross-tenant by design, so it uses the unscoped client. */
export default async function SuperAdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/super`)}`);
  if (session.user.isSuperAdmin !== true) notFound();

  const clinics = await systemDb.clinic.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true, status: true, _count: { select: { memberships: true } } },
  });
  const t = await getTranslations("super");

  return (
    <>
      <SiteHeader right={<SignOutButton />} />
      <main id="main" className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <h2 className="mt-8 text-xl font-bold">{t("clinics")}</h2>
        <ul className="bg-card mt-4 divide-y rounded-lg border">
          {clinics.map((c) => (
            <li key={c.slug} className="flex items-center justify-between gap-4 px-4 py-3">
              <Link href={`/app/${c.slug}`} className="font-medium hover:underline">
                {c.name}
              </Link>
              <span className="text-muted-foreground figures text-sm">
                {t("members", { count: c._count.memberships })}
              </span>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
