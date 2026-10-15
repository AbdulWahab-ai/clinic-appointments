/**
 * Pure argument rewriting for the tenant-scoped client. Kept separate from the Prisma
 * extension so it can be unit-tested without a database.
 */

export class TenantScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantScopeError";
  }
}

type Args = Record<string, unknown> | undefined;
type Where = Record<string, unknown>;

const READS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);
const FILTERED_WRITES = new Set([
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
]);
const CREATES = new Set(["create", "createMany", "createManyAndReturn"]);

function withClinicFilter(where: Where | undefined, clinicId: string, shared: boolean): Where {
  const base = where ?? {};
  if ("clinicId" in base && base.clinicId !== clinicId && !(shared && base.clinicId === null)) {
    throw new TenantScopeError(`Query filters on a different clinicId than the active tenant`);
  }
  if (shared) {
    // Explicitly asking for platform-wide rows only.
    if ("clinicId" in base && base.clinicId === null) return base;
    // Otherwise: own rows plus platform-wide rows (clinicId IS NULL).
    const { clinicId: _ignored, ...rest } = base;
    return { ...rest, AND: [...asArray(rest.AND), { OR: [{ clinicId }, { clinicId: null }] }] };
  }
  return { ...base, clinicId };
}

function asArray(value: unknown): unknown[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function stampData(data: unknown, clinicId: string): unknown {
  if (Array.isArray(data)) return data.map((d) => stampData(d, clinicId));
  if (!data || typeof data !== "object") return data;
  const row = data as Record<string, unknown>;
  if ("clinic" in row) {
    throw new TenantScopeError("Use scalar clinicId, not the `clinic` relation, in tenant writes");
  }
  if ("clinicId" in row && row.clinicId !== clinicId) {
    throw new TenantScopeError("Write sets a different clinicId than the active tenant");
  }
  return { ...row, clinicId };
}

function forbidClinicChange(data: unknown, clinicId: string) {
  if (data && typeof data === "object" && "clinicId" in data) {
    const value = (data as Record<string, unknown>).clinicId;
    if (value !== clinicId)
      throw new TenantScopeError("Updates can't move a row to another clinic");
  }
  if (data && typeof data === "object" && "clinic" in data) {
    throw new TenantScopeError("Updates can't change the `clinic` relation");
  }
}

export function scopeArgs(
  model: string,
  operation: string,
  rawArgs: Args,
  clinicId: string,
  shared: boolean,
): Args {
  const args: Record<string, unknown> = { ...(rawArgs ?? {}) };

  if (READS.has(operation)) {
    args.where = withClinicFilter(args.where as Where | undefined, clinicId, shared);
    return args;
  }

  if (FILTERED_WRITES.has(operation)) {
    forbidClinicChange(args.data, clinicId);
    // Writes never touch platform rows, even for shared models.
    args.where = withClinicFilter(args.where as Where | undefined, clinicId, false);
    return args;
  }

  if (CREATES.has(operation)) {
    args.data = stampData(args.data, clinicId);
    return args;
  }

  if (operation === "upsert") {
    forbidClinicChange(args.update, clinicId);
    args.where = withClinicFilter(args.where as Where | undefined, clinicId, false);
    args.create = stampData(args.create, clinicId);
    return args;
  }

  throw new TenantScopeError(
    `Operation "${operation}" on ${model} isn't supported by the tenant scope`,
  );
}
