import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("errors");
  const tc = useTranslations("common");
  return (
    <main id="main" className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-3xl font-bold">{t("notFoundTitle")}</h1>
      <p className="text-muted-foreground mt-3">{t("notFoundBody")}</p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/">{tc("backHome")}</Link>
      </Button>
    </main>
  );
}
