import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const serverOnlyStub = fileURLToPath(
  new URL("./tests/helpers/server-only-stub.ts", import.meta.url),
);

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // "server-only" throws outside the Next.js server bundle; tests run server code directly.
    alias: { "server-only": serverOnlyStub },
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/server/**", "src/lib/**"],
      exclude: ["src/generated/**"],
      reporter: ["text", "html"],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/helpers/unit-env.ts"],
        },
      },
      {
        extends: true,
        plugins: [react()],
        test: {
          name: "components",
          include: ["tests/components/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["tests/helpers/unit-env.ts", "tests/helpers/components-setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/helpers/integration-env.ts"],
          globalSetup: ["tests/helpers/integration-global-setup.ts"],
          // One database: run files serially so resets don't collide.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
