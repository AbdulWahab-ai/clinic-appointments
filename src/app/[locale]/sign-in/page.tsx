import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { safeNextPath } from "@/lib/safe-redirect";
import { SignInForm } from "./sign-in-form";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("signInTitle") };
}

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const { locale } = await params;
  const { next, reason } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const safeNext = safeNextPath(next, `/${locale}/app`);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-3xl font-bold">{t("signInTitle")}</h1>
        <p className="text-muted-foreground mt-2">{t("signInLede")}</p>
        {reason === "idle" && (
          <Alert className="mt-6">
            <AlertDescription>{t("idleSignedOut")}</AlertDescription>
          </Alert>
        )}
        <SignInForm next={safeNext} />
      </main>
    </>
  );
}
