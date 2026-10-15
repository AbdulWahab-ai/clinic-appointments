import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { SiteHeader } from "@/components/site-header";
import { TokenSlip } from "@/components/token-slip";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("home");

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-5xl px-4 py-12 sm:py-20">
        <section className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
          <div className="max-w-[34rem]">
            <h1 className="text-4xl leading-[1.1] font-bold sm:text-5xl">{t("title")}</h1>
            <p className="text-muted-foreground mt-5 text-lg">{t("lede")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/c/shifa-family">{t("findClinic")}</Link>
              </Button>
            </div>
            <p className="text-muted-foreground mt-3 text-sm">{t("demoClinic")}</p>
          </div>
          <div className="flex flex-col items-center gap-4 md:items-end">
            <TokenSlip number={17} label={t("tokenLabel")} serving />
            <p className="figures text-muted-foreground max-w-[16rem] text-center text-sm md:text-end">
              {t("tokenStatus")}
            </p>
          </div>
        </section>

        <section className="mt-20 border-t pt-8">
          <h2 className="text-xl font-bold">{t("forClinics")}</h2>
          <p className="text-muted-foreground mt-2 max-w-[40rem]">{t("forClinicsBody")}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/sign-in">{t("staffSignIn")}</Link>
          </Button>
        </section>
      </main>
    </>
  );
}
