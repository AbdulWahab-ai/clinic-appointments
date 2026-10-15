"use client";

import { createAuthClient } from "better-auth/react";
import { phoneNumberClient, twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    phoneNumberClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        const next = new URLSearchParams(window.location.search).get("next") ?? "";
        // Runs outside React (no router available); a full navigation is intended here.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = `${window.location.pathname.replace(/\/sign-in.*$/, "")}/sign-in/two-factor${
          next ? `?next=${encodeURIComponent(next)}` : ""
        }`;
      },
    }),
  ],
});
