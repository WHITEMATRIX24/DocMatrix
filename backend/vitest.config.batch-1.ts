import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Reproduce audit regressions against the original tracked implementation without
// resetting the working tree or changing any of the user's uncommitted files.
const original = new Set([
  'src/billing/billing.service.ts',
  'src/common/guards/tenant.guard.ts',
  'src/clinical-notes/clinical-notes.controller.ts',
  'src/treatment-plans/treatment-plans.service.ts',
  'src/subscriptions/subscriptions.controller.ts',
  'src/storage/storage.service.ts',
  'src/storage/malware-scanner.service.ts',
  'src/inventory/dto/confirm-deduction.dto.ts',
  'src/inventory/inventory.service.ts',
  'src/clinical-notes/clinical-notes.service.ts',
  'src/prescriptions/prescriptions.service.ts',
]);
export default defineConfig({
  plugins:
    process.env.BATCH1_AUDIT_BASELINE === 'true'
      ? [
          {
            name: 'audit-baseline',
            enforce: 'pre',
            load(id) {
              const relative = path
                .relative(process.cwd(), id)
                .replaceAll('\\', '/');
              if (original.has(relative))
                return readFileSync(
                  path.join(process.cwd(), '.security-test/baseline', relative),
                  'utf8',
                );
            },
          },
        ]
      : [],
  test: {
    globals: true,
    include: ['src/security/**/*.spec.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    maxWorkers: 2,
  },
});
