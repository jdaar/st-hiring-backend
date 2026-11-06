import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'backend',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // migrations and seeds are run by knex, not by the app
      exclude: ['src/**/*.test.ts', 'src/database/**'],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
    },
  },
});
