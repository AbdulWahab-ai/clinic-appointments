import "server-only";
import { systemDb } from "./client";
import { isSharedModel, isTenantModel } from "./tenant-models";
import { scopeArgs } from "./tenant-scope";

/**
 * Database client scoped to one clinic. Every query on a tenant model gets
 * `clinicId` injected into its filter and its written rows, so a handler can't read or
 * change another clinic's data even if it is handed a foreign id.
 *
 * Limits (keep in mind when writing services):
 * - Nested writes (`create: { statusHistory: { create: {...} } }`) aren't rewritten; pass
 *   clinicId explicitly. Composite foreign keys (id, clinicId) reject cross-clinic links
 *   at the database level anyway.
 * - Use scalar `clinicId`, not `clinic: { connect }`, in create data.
 * - $queryRaw / $executeRaw are not scoped. Always filter by clinicId by hand.
 */
export function getTenantDb(clinicId: string) {
  if (!clinicId) throw new Error("getTenantDb: clinicId is required");

  return systemDb.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!isTenantModel(model) && !isSharedModel(model)) return query(args);
          return query(
            scopeArgs(model, operation, args, clinicId, isSharedModel(model)) as typeof args,
          );
        },
      },
    },
  });
}

export type TenantDb = ReturnType<typeof getTenantDb>;
