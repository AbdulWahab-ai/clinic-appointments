import { describe, expect, it } from "vitest";
import { formatMoney, formatTime } from "@/lib/format";
import { parseClinicSettings } from "@/lib/clinic-settings";

describe("formatMoney", () => {
  it("formats paisa as rupees without decimals when whole", () => {
    expect(formatMoney(250000, "PKR", "en")).toMatch(/2,500/);
    expect(formatMoney(250000, "PKR", "en")).not.toMatch(/\.00/);
  });

  it("keeps decimals when needed", () => {
    expect(formatMoney(12345, "PKR", "en")).toMatch(/123\.45/);
  });
});

describe("formatTime", () => {
  it("renders in the branch timezone, not the server's", () => {
    // 04:30 UTC is 09:30 in Karachi (UTC+5, no DST).
    expect(formatTime(new Date("2026-10-15T04:30:00Z"), "Asia/Karachi", "en")).toMatch(/9:30/);
  });
});

describe("clinic settings", () => {
  it("fills defaults for an empty settings column", () => {
    const s = parseClinicSettings({});
    expect(s.booking.holdMinutes).toBe(10);
    expect(s.reminders.offsetsMinutes).toEqual([1440, 120]);
    expect(s.languages).toEqual(["en", "ur"]);
  });

  it("keeps stored values and rejects invalid ones", () => {
    expect(parseClinicSettings({ booking: { holdMinutes: 5 } }).booking.holdMinutes).toBe(5);
    expect(() => parseClinicSettings({ booking: { horizonDays: 0 } })).toThrow();
  });
});
