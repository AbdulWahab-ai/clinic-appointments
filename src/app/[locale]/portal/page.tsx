import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/server/auth/session";

/** Patient portal. Appointment history, receipts and dependents arrive in Phase 3 and 9. */
export default async function PortalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/portal`)}`);
  const t = await getTranslations("portal");

  return (
    <>
      <SiteHeader right={<SignOutButton />} />
      <main id="main" className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-4">{t("empty")}</p>
      </main>
    </>
  );
}
