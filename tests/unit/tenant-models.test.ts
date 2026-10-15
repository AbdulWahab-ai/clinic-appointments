import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GLOBAL_MODELS, SHARED_MODELS, TENANT_MODELS } from "@/server/db/tenant-models";

/** Reads model names and their clinicId column from schema.prisma. */
function modelsFromSchema() {
  const schema = readFileSync(new URL("../../prisma/schema.prisma", import.meta.url), "utf8");
  const models = new Map<string, "required" | "optional" | "none">();
  for (const match of schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
    const [, name, body] = match as unknown as [string, string, string];
    const field = body.match(/^\s+clinicId\s+String(\?)?/m);
    models.set(name, field ? (field[1] ? "optional" : "required") : "none");
  }
  return models;
}

describe("tenant model registry", () => {
  const models = modelsFromSchema();

  it("classifies every model in the schema exactly once", () => {
    const listed = [...TENANT_MODELS, ...SHARED_MODELS, ...GLOBAL_MODELS];
    expect(new Set(listed).size).toBe(listed.length);
    expect([...models.keys()].sort()).toEqual([...listed].sort());
  });

  it("lists every model with a required clinicId as a tenant model", () => {
    for (const [name, kind] of models) {
      if (kind === "required") expect(TENANT_MODELS, name).toContain(name);
    }
  });

  it("scopes every model with an optional clinicId (shared or strict tenant)", () => {
    const scoped = [...SHARED_MODELS, ...TENANT_MODELS] as string[];
    for (const [name, kind] of models) {
      if (kind === "optional") expect(scoped, name).toContain(name);
    }
  });

  it("only marks models with an optional clinicId as shared", () => {
    for (const name of SHARED_MODELS) expect(models.get(name), name).toBe("optional");
  });

  it("only marks models without clinicId as global", () => {
    for (const name of GLOBAL_MODELS) expect(models.get(name), name).toBe("none");
  });
});
