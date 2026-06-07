import { defineConfig } from 'vitest/config';

// Standalone config so tests don't load the alphaTab Vite plugin.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
