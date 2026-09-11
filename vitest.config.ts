import { defineVitestConfig } from "@nuxt/test-utils/config";

export default defineVitestConfig({
  test: {
    restoreMocks: true,
    exclude: ["**/node_modules/**", "**/.nuxt/**", "**/.output/**", "tests/e2e/**"],
  },
});
