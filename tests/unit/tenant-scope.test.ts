import { describe, expect, it } from "vitest";
import { scopeArgs, TenantScopeError } from "@/server/db/tenant-scope";

const A = "clinic-a";
const B = "clinic-b";

describe("tenant scope: reads", () => {
  it.each(["findMany", "findFirst", "findUnique", "count", "aggregate", "groupBy"])(
    "%s injects clinicId",
    (op) => {
      expect(scopeArgs("Patient", op, { where: { name: "x" } }, A, false)).toEqual({
        where: { name: "x", clinicId: A },
      });
    },
  );

  it("adds a filter when there is none", () => {
    expect(scopeArgs("Patient", "findMany", undefined, A, false)).toEqual({
      where: { clinicId: A },
    });
  });

  it("rejects an explicit filter on another clinic", () => {
    expect(() => scopeArgs("Patient", "findMany", { where: { clinicId: B } }, A, false)).toThrow(
      TenantScopeError,
    );
  });

  it("can't be escaped with OR", () => {
    const scoped = scopeArgs(
      "Patient",
      "findMany",
      { where: { OR: [{ clinicId: B }, { id: "1" }] } },
      A,
      false,
    );
    // The OR stays, but the top-level AND with clinicId still pins the tenant.
    expect(scoped).toEqual({ where: { OR: [{ clinicId: B }, { id: "1" }], clinicId: A } });
  });

  it("shared models also see platform rows", () => {
    expect(scopeArgs("Holiday", "findMany", { where: { date: "d" } }, A, true)).toEqual({
      where: { date: "d", AND: [{ OR: [{ clinicId: A }, { clinicId: null }] }] },
    });
  });

  it("shared models can ask for platform rows only", () => {
    expect(scopeArgs("Holiday", "findMany", { where: { clinicId: null } }, A, true)).toEqual({
      where: { clinicId: null },
    });
  });
});

describe("tenant scope: writes", () => {
  it("stamps clinicId on create", () => {
    expect(scopeArgs("Patient", "create", { data: { name: "x" } }, A, false)).toEqual({
      data: { name: "x", clinicId: A },
    });
  });

  it("stamps every row of createMany", () => {
    expect(
      scopeArgs("Patient", "createMany", { data: [{ name: "x" }, { name: "y" }] }, A, false),
    ).toEqual({
      data: [
        { name: "x", clinicId: A },
        { name: "y", clinicId: A },
      ],
    });
  });

  it("rejects creating rows for another clinic", () => {
    expect(() => scopeArgs("Patient", "create", { data: { clinicId: B } }, A, false)).toThrow(
      TenantScopeError,
    );
  });

  it("rejects the clinic relation in writes", () => {
    expect(() =>
      scopeArgs("Patient", "create", { data: { clinic: { connect: { id: B } } } }, A, false),
    ).toThrow(/scalar clinicId/);
  });

  it.each(["update", "updateMany", "delete", "deleteMany"])(
    "%s is filtered to the tenant",
    (op) => {
      expect(
        scopeArgs("Patient", op, { where: { id: "1" }, data: { name: "n" } }, A, false),
      ).toMatchObject({
        where: { id: "1", clinicId: A },
      });
    },
  );

  it("refuses to move a row to another clinic", () => {
    expect(() =>
      scopeArgs("Patient", "update", { where: { id: "1" }, data: { clinicId: B } }, A, false),
    ).toThrow(/another clinic/);
  });

  it("never lets shared-model writes touch platform rows", () => {
    expect(scopeArgs("Holiday", "deleteMany", { where: { id: "1" } }, A, true)).toEqual({
      where: { id: "1", clinicId: A },
    });
  });

  it("scopes upsert where and create", () => {
    expect(
      scopeArgs(
        "Patient",
        "upsert",
        { where: { id: "1" }, create: { name: "x" }, update: { name: "y" } },
        A,
        false,
      ),
    ).toEqual({
      where: { id: "1", clinicId: A },
      create: { name: "x", clinicId: A },
      update: { name: "y" },
    });
  });

  it("fails closed on unknown operations", () => {
    expect(() => scopeArgs("Patient", "somethingNew", {}, A, false)).toThrow(/isn't supported/);
  });
});
