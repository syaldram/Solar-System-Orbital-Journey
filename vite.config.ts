import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/Solar-System-Orbital-Journey/',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
