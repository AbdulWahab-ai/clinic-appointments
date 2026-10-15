"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";

/** Shows the other language as a link, written in that language. */
export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const t = useTranslations("common");
  const target = locale === "ur" ? "en" : "ur";

  return (
    <Link
      href={search ? `${pathname}?${search}` : pathname}
      locale={target}
      lang={target}
      className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1 text-sm underline-offset-4 hover:underline"
    >
      {target === "ur" ? t("switchToUrdu") : t("switchToEnglish")}
    </Link>
  );
}
