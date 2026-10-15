import { describe, expect, it } from "vitest";
import { maskPhone, normalizePhone } from "@/lib/phone";

describe("normalizePhone", () => {
  it.each([
    ["03001234567", "+923001234567"],
    ["0300-1234567", "+923001234567"],
    ["0300 123 4567", "+923001234567"],
    ["3001234567", "+923001234567"],
    ["+92 300 1234567", "+923001234567"],
    ["00923001234567", "+923001234567"],
    ["+923001234567", "+923001234567"],
    ["+447700900123", "+447700900123"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "abc", "123", "0300", "+92123", "+0123456789"])("rejects %j", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("maskPhone", () => {
  it("keeps the country code and last four digits", () => {
    expect(maskPhone("+923001234567")).toBe("+92 300 ***4567");
  });
});
