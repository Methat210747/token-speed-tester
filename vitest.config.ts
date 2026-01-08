import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["dist", "node_modules", "tests", "src/index.ts"],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 100,
        lines: 95,
      },
    },
  },
});
