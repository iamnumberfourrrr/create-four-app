import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run tests sequentially — each spawns CLI processes that write to tmpdir;
    // parallel execution risks port/resource contention on slow CI machines.
    pool: "forks",
    singleFork: true,
    testTimeout: 120_000,
    hookTimeout: 30_000,
    include: ["tests/**/*.test.ts"],
  },
});
