import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptField, encryptField, needsRotation, parseKeyRing } from "@/server/crypto/fields";

const key = () => randomBytes(32).toString("base64");

describe("field encryption", () => {
  const ring = parseKeyRing(`v1:${key()}`);

  it("round-trips unicode text", () => {
    const text = "مریض کو بخار ہے۔ BP 120/80";
    const enc = encryptField(text, "appointment:1:notes", ring);
    expect(enc).not.toContain("BP");
    expect(decryptField(enc, "appointment:1:notes", ring)).toBe(text);
  });

  it("uses a fresh IV every time", () => {
    expect(encryptField("same", "c", ring)).not.toBe(encryptField("same", "c", ring));
  });

  it("refuses ciphertext moved to another context", () => {
    const enc = encryptField("secret", "appointment:1:notes", ring);
    expect(() => decryptField(enc, "appointment:2:notes", ring)).toThrow();
  });

  it("detects tampering", () => {
    const enc = encryptField("secret", "c", ring).split(".");
    const data = Buffer.from(enc[3]!, "base64url");
    data[0] = data[0]! ^ 0xff;
    enc[3] = data.toString("base64url");
    expect(() => decryptField(enc.join("."), "c", ring)).toThrow();
  });

  it("decrypts with an old key after rotation and flags it for re-encryption", () => {
    const oldKey = key();
    const before = parseKeyRing(`v1:${oldKey}`);
    const enc = encryptField("note", "c", before);
    const after = parseKeyRing(`v2:${key()},v1:${oldKey}`);
    expect(decryptField(enc, "c", after)).toBe("note");
    expect(needsRotation(enc, after)).toBe(true);
    expect(needsRotation(encryptField("note", "c", after), after)).toBe(false);
  });

  it("rejects bad key specs", () => {
    expect(() => parseKeyRing("")).toThrow();
    expect(() => parseKeyRing("v1:c2hvcnQ=")).toThrow(/32 bytes/);
    expect(() => parseKeyRing("nokey")).toThrow();
  });

  it("rejects unknown key versions and malformed payloads", () => {
    expect(() => decryptField("v9.a.b.c", "c", ring)).toThrow(/Unknown/);
    expect(() => decryptField("garbage", "c", ring)).toThrow(/Malformed/);
  });
});
