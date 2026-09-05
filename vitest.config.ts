import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.ts"],
    globals: false,
    // Vitest stubs CSS imports out by default. The deck's stylesheet is data
    // the renderer hands to a host, not decoration, so a test that reads it
    // has to see the real file.
    css: { include: [/slides\.css/] },
  },
});
