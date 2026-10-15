import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Staff idle timeout. The proxy stamps a signed "last active" cookie on every staff-app
 * request; when the gap since the previous request exceeds the limit, the session is
 * revoked server-side (src/app/api/session/idle/route.ts).
 *
 * Pure functions so they can be unit-tested with a fake clock.
 */
export const ACTIVITY_COOKIE = "clinic.last_active";

function sign(timestamp: number, secret: string): string {
  return createHmac("sha256", secret).update(`last_active:${timestamp}`).digest("base64url");
}

export function encodeActivity(now: number, secret: string): string {
  return `${now}.${sign(now, secret)}`;
}

/** Returns the timestamp in the cookie, or null when it's missing, malformed or forged. */
export function decodeActivity(value: string | undefined, secret: string): number | null {
  if (!value) return null;
  const [raw, signature] = value.split(".");
  const timestamp = Number(raw);
  if (!raw || !signature || !Number.isSafeInteger(timestamp)) return null;
  const expected = Buffer.from(sign(timestamp, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return timestamp;
}

export type IdleVerdict = "active" | "expired" | "unknown";

/**
 * "unknown" (no valid cookie) is treated as a fresh start, not an expiry: the cookie is
 * first set right after sign-in, and a forged/missing cookie can't extend a session
 * because Better Auth's own expiry still applies.
 */
export function checkIdle(
  cookie: string | undefined,
  now: number,
  timeoutMinutes: number,
  secret: string,
): IdleVerdict {
  const last = decodeActivity(cookie, secret);
  if (last === null) return "unknown";
  if (last > now + 60_000) return "unknown";
  return now - last > timeoutMinutes * 60_000 ? "expired" : "active";
}
