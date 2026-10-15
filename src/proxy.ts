import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { ACTIVITY_COOKIE, checkIdle, encodeActivity } from "@/server/auth/idle";

const intl = createIntlMiddleware(routing);

const STAFF_PATH = /^\/(en|ur)\/app(\/|$)/;

function hasSessionCookie(request: NextRequest) {
  return request.cookies.getAll().some((c) => c.name.endsWith("session_token"));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isStaff = STAFF_PATH.test(pathname) && hasSessionCookie(request);
  const secret = process.env.BETTER_AUTH_SECRET ?? "";
  const timeout = Number(process.env.STAFF_IDLE_TIMEOUT_MINUTES ?? 30);
  const now = Date.now();

  if (isStaff) {
    const verdict = checkIdle(request.cookies.get(ACTIVITY_COOKIE)?.value, now, timeout, secret);
    if (verdict === "expired") {
      const url = new URL("/api/session/idle", request.nextUrl.origin);
      url.searchParams.set("locale", pathname.split("/")[1] ?? routing.defaultLocale);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
  }

  const response = intl(request);

  if (isStaff) {
    response.cookies.set(ACTIVITY_COOKIE, encodeActivity(now, secret), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
  return response;
}

export const config = {
  // Everything except API routes, the embeddable widget, Next internals and static files.
  matcher: ["/((?!api|embed|_next|_vercel|.*\\..*).*)"],
};
