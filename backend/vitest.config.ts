import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Unit suites never inherit the operator's live antivirus configuration.
    env: { MALWARE_SCANNER: '', CLAMAV_HOST: '', SCANNER_REQUIRED: 'false' },
    root: './',
    include: ['**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/.verification/**', 'test/app.e2e-spec.ts'],
  },
});
