import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ur"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
});

/** Right-to-left locales. Layouts set <html dir> from this. */
export const RTL_LOCALES: ReadonlySet<Locale> = new Set(["ur"]);

export const isRtl = (locale: string) => RTL_LOCALES.has(locale as Locale);
