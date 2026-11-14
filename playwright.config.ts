import { defineSharedPlaywrightConfig } from '@nlabrazi/config-playwright'

export default defineSharedPlaywrightConfig({
  port: 3100,
  fullyParallel: true,
  mobile: true,
  retries: process.env.CI ? 2 : 0,
  command: 'npx nuxt dev --port 3100',
  webServerTimeout: 60_000,
})
