import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      include: ['src/lib/**/*.{ts,tsx}', 'convex/lib/**/*.ts'],
      exclude: ['node_modules/', 'dist/', 'coverage/', 'convex/_generated/'],
    },
  },
})
