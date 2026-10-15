import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/server/auth/auth";
import { ACTIVITY_COOKIE } from "@/server/auth/idle";
import { routing } from "@/i18n/routing";
import { safeNextPath } from "@/lib/safe-redirect";

/** Revokes the session after staff inactivity, then sends the user to sign-in. */
export async function GET(request: NextRequest) {
  const localeParam = request.nextUrl.searchParams.get("locale") ?? routing.defaultLocale;
  const locale = (routing.locales as readonly string[]).includes(localeParam)
    ? localeParam
    : routing.defaultLocale;
  const next = request.nextUrl.searchParams.get("next") ?? "";
  const safeNext = safeNextPath(next, "");

  const signOut = await auth.api.signOut({ headers: request.headers, asResponse: true });

  const target = new URL(`/${locale}/sign-in`, request.nextUrl.origin);
  target.searchParams.set("reason", "idle");
  if (safeNext) target.searchParams.set("next", safeNext);

  const response = NextResponse.redirect(target);
  for (const cookie of signOut.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  response.cookies.delete(ACTIVITY_COOKIE);
  return response;
}
