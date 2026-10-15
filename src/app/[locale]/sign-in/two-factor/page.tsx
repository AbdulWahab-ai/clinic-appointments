import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { safeNextPath } from "@/lib/safe-redirect";
import { TwoFactorForm } from "./two-factor-form";

export default async function TwoFactorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  const { next } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const safeNext = safeNextPath(next, `/${locale}/app`);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-3xl font-bold">{t("twoFactorTitle")}</h1>
        <p className="text-muted-foreground mt-2">{t("twoFactorLede")}</p>
        <TwoFactorForm next={safeNext} />
      </main>
    </>
  );
}
