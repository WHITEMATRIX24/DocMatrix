import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { access } from 'node:fs/promises';
const execution = vi.hoisted(() => ({ failure: false, file: '', options: {} as any }));
vi.mock('node:child_process', () => ({
  execFile: (_program: string, args: string[], options: any, callback: any) => {
    execution.file = args[args.indexOf('-File') + 1];
    execution.options = options;
    expect(args).toContain('-DisableRemediation');
    callback(execution.failure ? new Error('Scanner exited with code 2') : null, 'Scan finished.', '');
  },
}));
import { MalwareScannerService, WindowsDefenderScannerAdapter } from './malware-scanner.service.js';

describe.skipIf(process.platform !== 'win32')('Windows Defender upload adapter', () => {
  afterEach(() => { execution.failure = false; vi.unstubAllEnvs(); });
  it('accepts completed scans and removes only its temporary file', async () => {
    expect(await new WindowsDefenderScannerAdapter().scanStream(Buffer.from('harmless'))).toEqual({ isClean: true });
    expect(execution.options).toMatchObject({ timeout: 30000, windowsHide: true });
    await expect(access(execution.file)).rejects.toThrow();
  });
  it('rejects ambiguous engine errors and still removes scratch data', async () => {
    execution.failure = true;
    await expect(new WindowsDefenderScannerAdapter().scanStream(Buffer.from('sample'))).rejects.toThrow('could not confirm');
    await expect(access(execution.file)).rejects.toThrow();
  });
  it('fails closed through the upload service when the scanner cannot confirm a result', async () => {
    vi.stubEnv('MALWARE_SCANNER', 'windows-defender');
    vi.stubEnv('SCANNER_REQUIRED', 'true');
    execution.failure = true;
    await expect(new MalwareScannerService().scanBuffer(Buffer.from('%PDF-1.4'), 'test.pdf')).rejects.toThrow(ServiceUnavailableException);
  });
});
