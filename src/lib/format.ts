/** Locale-aware formatting. Money is integer minor units (paisa for PKR). */

const intlLocale = (locale: string) => (locale === "ur" ? "ur-PK" : "en-PK");

export function formatMoney(minor: number, currency = "PKR", locale = "en"): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

export function formatTime(date: Date, timeZone: string, locale = "en"): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

export function formatDate(date: Date, timeZone: string, locale = "en"): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone,
  }).format(date);
}
