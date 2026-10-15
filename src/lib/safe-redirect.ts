/**
 * Validates a post-login `next` path so it can only point inside this app.
 * Rejects absolute URLs, protocol-relative URLs (`//evil.com`), backslash variants that
 * browsers normalize to `//` (`/\evil.com`), and control characters.
 */
export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    // Resolve against a dummy origin; anything that changes origin is rejected.
    const url = new URL(next, "http://app.invalid");
    if (url.origin !== "http://app.invalid") return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
