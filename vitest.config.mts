import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      // Test scaffolding and type-only modules are not the code under test.
      exclude: ["src/lib/test-utils.ts", "src/lib/types.ts", "src/lib/**/*.test.ts"],
      thresholds: { lines: 95, functions: 95, branches: 90, statements: 95 },
    },
  },
});
