import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/safe-redirect";

const FALLBACK = "/en/app";

describe("safeNextPath", () => {
  it.each([
    ["/en/app/shifa-family", "/en/app/shifa-family"],
    ["/ur/portal?tab=upcoming", "/ur/portal?tab=upcoming"],
    ["/en/app#today", "/en/app#today"],
  ])("keeps internal path %s", (input, expected) => {
    expect(safeNextPath(input, FALLBACK)).toBe(expected);
  });

  it.each([
    undefined,
    null,
    "",
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "/\\/evil.com",
    "\\\\evil.com",
    "javascript:alert(1)",
    "en/app",
    "/en/app\r\nSet-Cookie: x=1",
    "/%5Cevil.com/..",
  ])("rejects %j", (input) => {
    const result = safeNextPath(input, FALLBACK);
    expect(result === FALLBACK || (result.startsWith("/") && !result.startsWith("//"))).toBe(true);
    expect(result).not.toMatch(/evil\.com|javascript:|\r|\n/);
  });
});
