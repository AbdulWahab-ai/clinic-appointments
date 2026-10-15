import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";

export function SiteHeader({ right }: { right?: React.ReactNode }) {
  const t = useTranslations("common");
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" className="font-bold">
          {t("appName")}
        </Link>
        <div className="flex items-center gap-2">
          <Suspense>
            <LocaleSwitcher />
          </Suspense>
          {right}
        </div>
      </div>
    </header>
  );
}
