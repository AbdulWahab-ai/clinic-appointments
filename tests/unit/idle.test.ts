import { describe, expect, it } from "vitest";
import { checkIdle, decodeActivity, encodeActivity } from "@/server/auth/idle";

const SECRET = "test-secret";
const MIN = 60_000;
const t0 = 1_800_000_000_000;

describe("staff idle timeout", () => {
  it("is active within the window", () => {
    expect(checkIdle(encodeActivity(t0, SECRET), t0 + 29 * MIN, 30, SECRET)).toBe("active");
  });

  it("expires after the window", () => {
    expect(checkIdle(encodeActivity(t0, SECRET), t0 + 31 * MIN, 30, SECRET)).toBe("expired");
  });

  it("treats a missing cookie as a fresh start", () => {
    expect(checkIdle(undefined, t0, 30, SECRET)).toBe("unknown");
  });

  it("ignores forged or tampered cookies", () => {
    const forged = `${t0 + 10 * MIN}.${encodeActivity(t0, SECRET).split(".")[1]}`;
    expect(decodeActivity(forged, SECRET)).toBeNull();
    expect(decodeActivity(encodeActivity(t0, "other-secret"), SECRET)).toBeNull();
    expect(decodeActivity("not-a-cookie", SECRET)).toBeNull();
  });

  it("ignores timestamps from the future", () => {
    expect(checkIdle(encodeActivity(t0 + 10 * MIN, SECRET), t0, 30, SECRET)).toBe("unknown");
  });

  it("round-trips the timestamp", () => {
    expect(decodeActivity(encodeActivity(t0, SECRET), SECRET)).toBe(t0);
  });
});
