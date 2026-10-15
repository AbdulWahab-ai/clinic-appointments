import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import en from "../../messages/en.json";
import ur from "../../messages/ur.json";

const MESSAGES = { en, ur } as const;

/** Renders a component inside the real next-intl provider with the real message files. */
export function renderWithIntl(ui: ReactElement, locale: "en" | "ur" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="Asia/Karachi">
      {ui}
    </NextIntlClientProvider>,
  );
}

export { en as enMessages, ur as urMessages };
