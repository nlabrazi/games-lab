import { createSharedCoverageConfig, DEFAULT_EXCLUDES } from '@nlabrazi/config-vitest'
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    restoreMocks: true,
    exclude: DEFAULT_EXCLUDES,
    coverage: createSharedCoverageConfig({
      thresholds: {
        lines: 70,
      },
    }),
  },
})
