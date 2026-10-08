// SPDX-License-Identifier: GPL-3.0-or-later
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts'],
      // Seuils de CONSTRAINTS.md : ils montent avec le projet, ils ne baissent jamais.
      thresholds: { lines: 90, functions: 90, branches: 80, statements: 90 },
    },
  },
});
