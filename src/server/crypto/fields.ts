import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Field-level encryption for sensitive columns (`*Enc`): visit notes, form answers,
 * OAuth tokens. AES-256-GCM with a random 96-bit IV per value.
 *
 * Ciphertext format: "<keyVersion>.<iv b64url>.<tag b64url>.<ciphertext b64url>"
 * Keys come from FIELD_ENCRYPTION_KEYS ("v2:key,v1:key"): the first key encrypts, any
 * listed key decrypts, so keys can be rotated without rewriting old rows at once.
 *
 * `context` is bound as additional authenticated data (e.g. "appointment:<id>:notes"),
 * so ciphertext copied into another row or column fails to decrypt.
 */

export interface KeyRing {
  current: { version: string; key: Buffer };
  all: Map<string, Buffer>;
}

export function parseKeyRing(spec: string): KeyRing {
  const entries = spec
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [version, b64] = entry.split(":");
      if (!version || !b64 || !/^[a-z0-9]+$/i.test(version)) {
        throw new Error("Invalid FIELD_ENCRYPTION_KEYS entry");
      }
      const key = Buffer.from(b64, "base64");
      if (key.length !== 32) throw new Error(`Encryption key ${version} must be 32 bytes`);
      return [version, key] as const;
    });
  if (entries.length === 0) throw new Error("FIELD_ENCRYPTION_KEYS is empty");
  const [version, key] = entries[0]!;
  return { current: { version, key }, all: new Map(entries) };
}

export function encryptField(plaintext: string, context: string, ring: KeyRing): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ring.current.key, iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    ring.current.version,
    iv.toString("base64url"),
    tag.toString("base64url"),
    data.toString("base64url"),
  ].join(".");
}

export function decryptField(payload: string, context: string, ring: KeyRing): string {
  const parts = payload.split(".");
  if (parts.length !== 4) throw new Error("Malformed encrypted field");
  const [version, ivB64, tagB64, dataB64] = parts as [string, string, string, string];
  const key = ring.all.get(version);
  if (!key) throw new Error(`Unknown encryption key version ${version}`);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** True when the value was written with an older key and should be re-encrypted. */
export function needsRotation(payload: string, ring: KeyRing): boolean {
  return payload.split(".", 1)[0] !== ring.current.version;
}
