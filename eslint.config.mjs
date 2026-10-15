import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
    "src/generated/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
    },
  },
  // Tenant isolation: the unscoped Prisma client may only be imported where a
  // cross-tenant view is intended. Everything else must use getTenantDb().
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/server/db/**",
      "src/server/auth/**",
      "src/server/tenancy/**",
      "src/server/jobs/**",
      "src/server/dev/**",
      "src/app/api/health/**",
      "src/app/[[]locale]/super/**",
      "src/worker.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/server/db/client",
              message:
                "Unscoped DB access bypasses tenant isolation. Use getTenantDb(ctx) from @/server/db/tenant.",
            },
          ],
        },
      ],
    },
  },
  // Client components and shared libs must never pull in server-only code.
  {
    files: ["src/components/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@/server/*"], message: "Server code can't be imported here." }] },
      ],
    },
  },
]);
