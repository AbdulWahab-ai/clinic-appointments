import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import ur from "../../messages/ur.json";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)[,}]/g)].map((m) => m[1]).sort();

const enKeys = flatten(en as Tree);
const urKeys = flatten(ur as Tree);

describe("translations", () => {
  it("Urdu has every English key and nothing extra", () => {
    expect([...urKeys.keys()].sort()).toEqual([...enKeys.keys()].sort());
  });

  it("no translation is empty", () => {
    for (const [key, value] of [...enKeys, ...urKeys]) expect(value.trim(), key).not.toBe("");
  });

  it("placeholders match between languages", () => {
    for (const [key, value] of enKeys) {
      expect(placeholders(urKeys.get(key) ?? ""), key).toEqual(placeholders(value));
    }
  });

  it("Urdu strings are actually in Urdu script (except language names and brand-free tokens)", () => {
    const allowedLatin = new Set(["common.switchToEnglish"]);
    for (const [key, value] of urKeys) {
      if (allowedLatin.has(key)) continue;
      expect(/[؀-ۿ]/.test(value), key).toBe(true);
    }
  });

  it("every translation key used in source exists", () => {
    // Finds t("key") calls under useTranslations("ns") / getTranslations("ns") in the same file.
    const missing: string[] = [];
    let checked = 0;
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
        d.isDirectory()
          ? walk(join(dir, d.name))
          : /\.tsx?$/.test(d.name)
            ? [join(dir, d.name)]
            : [],
      );
    for (const file of walk(join(__dirname, "../../src"))) {
      const src = readFileSync(file, "utf8");
      const namespaces = new Map<string, string>();
      for (const m of src.matchAll(
        /const (\w+) = (?:await )?(?:useTranslations|getTranslations)\((?:\{[^}]*namespace: )?"([\w.]+)"/g,
      )) {
        namespaces.set(m[1]!, m[2]!);
      }
      for (const [fn, ns] of namespaces) {
        for (const m of src.matchAll(new RegExp(`\\b${fn}\\("([\\w.]+)"`, "g"))) {
          const key = `${ns}.${m[1]}`;
          checked++;
          if (!enKeys.has(key)) missing.push(`${file.split("src")[1]}: ${key}`);
        }
      }
    }
    expect(missing).toEqual([]);
    // Guard against the scan silently matching nothing.
    expect(checked).toBeGreaterThan(30);
  });
});
