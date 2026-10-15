import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./auth";

/** Current Better Auth session, or null. Cached for the duration of one request. */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});
