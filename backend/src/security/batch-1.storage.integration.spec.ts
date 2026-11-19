import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import net from 'node:net';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ClinicalController } from '../clinical/clinical.controller.js';
import { ClinicalService } from '../clinical/clinical.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import {
  MAX_FILE_SIZE_BYTES,
  StorageService,
} from '../storage/storage.service.js';
import { ClamAvScannerAdapter } from '../storage/malware-scanner.service.js';
import { LocalStorageProvider } from '../storage/local-storage.provider.js';

const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
Reflect.defineMetadata(
  'design:paramtypes',
  [ClinicalService],
  ClinicalController,
);

describe('Batch 1: real HTTP multipart limits and preview headers', () => {
  let app: INestApplication;
  afterEach(async () => {
    await app?.close();
  });
  const setup = async () => {
    const service = {
      createDocument: vi.fn(async () => ({ id: 'document' })),
      downloadDocument: vi.fn(async () => ({
        fileName: 'consent.pdf',
        mimeType: 'application/pdf',
        buffer: pdf,
        signedUrl: 'https://storage.invalid/signed',
      })),
    };
    const fixture = await Test.createTestingModule({
      controllers: [ClinicalController],
      providers: [{ provide: ClinicalService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          ctx.switchToHttp().getRequest().user = {
            id: 'doctor',
            clinicId: 'clinic',
            role: 'DOCTOR',
          };
          return true;
        },
      })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = fixture.createNestApplication();
    await app.init();
    return service;
  };

  it('#9 rejects an oversized multipart file before calling document storage', async () => {
    const service = await setup();
    const res = await request(app.getHttpServer())
      .post('/patients/patient/documents')
      .attach('file', Buffer.alloc(MAX_FILE_SIZE_BYTES + 1), 'oversized.pdf');
    expect(res.status).toBe(413);
    expect(service.createDocument.mock.calls.length).toBe(0);
  });

  it.each(['files', 'fields', 'field size'])(
    '#9 bounds multipart %s while allowing ordinary uploads',
    async (kind) => {
      const service = await setup();
      let req = request(app.getHttpServer()).post(
        '/patients/patient/documents',
      );
      if (kind === 'files')
        req = req.attach('file', pdf, 'one.pdf').attach('file', pdf, 'two.pdf');
      if (kind === 'fields')
        for (let i = 0; i < 11; i++) req = req.field(`field${i}`, 'value');
      if (kind === 'field size')
        req = req.field('notes', 'x'.repeat(64 * 1024 + 1));
      expect([400, 413]).toContain((await req).status);
      expect(service.createDocument.mock.calls.length).toBe(0);
      expect(
        (
          await request(app.getHttpServer())
            .post('/patients/patient/documents')
            .field('title', 'Consent')
            .field('category', 'Consent')
            .attach('file', pdf, 'consent.pdf')
        ).status,
      ).toBe(201);
    },
  );

  it('#11 keeps previews on a sandboxed opaque origin and ignores redirects', async () => {
    await setup();
    const res = await request(app.getHttpServer()).get(
      '/patients/patient/documents/document/preview?redirect=true',
    );
    expect(res.status).toBe(200);
    expect(res.headers.location).toBeUndefined();
    expect(res.headers['content-security-policy']).toContain('sandbox;');
    expect(res.headers['content-security-policy']).toContain(
      "script-src 'none'",
    );
    expect(res.headers['content-security-policy']).not.toContain(
      'allow-same-origin',
    );
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['content-disposition']).toMatch(/^inline;/);
  });
});

describe('Batch 1: ClamAV TCP protocol integration (emulated engine)', () => {
  let server: net.Server;
  const sockets = new Set<net.Socket>();
  afterEach(async () => {
    for (const socket of sockets) socket.destroy();
    sockets.clear();
    if (server?.listening)
      await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const listen = async (handler: (socket: net.Socket) => void) => {
    server = net.createServer((socket) => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
      handler(socket);
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    return (server.address() as net.AddressInfo).port;
  };

  it.each(['OK', 'Synthetic.Test FOUND'])(
    '#10 connects, streams INSTREAM frames and parses %s',
    async (result) => {
      let received = Buffer.alloc(0),
        command = false,
        body = Buffer.alloc(0);
      const port = await listen((socket) =>
        socket.on('data', (data) => {
          received = Buffer.concat([received, data]);
          if (!command) {
            const end = received.indexOf(0);
            if (end < 0) return;
            expect(received.subarray(0, end).toString()).toBe('zINSTREAM');
            received = received.subarray(end + 1);
            command = true;
          }
          while (received.length >= 4) {
            const size = received.readUInt32BE(0);
            if (received.length < size + 4) return;
            body = Buffer.concat([body, received.subarray(4, 4 + size)]);
            received = received.subarray(4 + size);
            if (!size) {
              socket.write(`stream: ${result}\0`);
              return;
            }
          }
        }),
      );
      const resultValue = await new ClamAvScannerAdapter(
        '127.0.0.1',
        port,
        1000,
      ).scanStream(pdf);
      expect(body.equals(pdf)).toBe(true);
      expect(resultValue.isClean).toBe(result === 'OK');
    },
  );

  it('#10 terminates a scanner that never responds', async () => {
    const port = await listen(() => {});
    await expect(
      new ClamAvScannerAdapter('127.0.0.1', port, 100).scanStream(pdf),
    ).rejects.toThrow(/deadline|timed out/);
  });

  it.each(['invalid response', 'oversized response', 'closed connection'])(
    '#10 fails closed for %s',
    async (scenario) => {
      const port = await listen((socket) => {
        if (scenario === 'closed connection') socket.destroy();
        else
          socket.once('data', () =>
            socket.write(
              scenario === 'invalid response'
                ? 'stream: NOT_OK\0'
                : 'x'.repeat(4097),
            ),
          );
      });
      await expect(
        new ClamAvScannerAdapter('127.0.0.1', port, 1000).scanStream(pdf),
      ).rejects.toThrow();
    },
  );
});

describe('Batch 1: local storage integration and strict content validation', () => {
  it('#11 round-trips allowed content through real local storage and rejects active/mismatched content', async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), 'docmatrix-batch1-storage-'),
    );
    if (
      path.dirname(path.resolve(root)) !== path.resolve(os.tmpdir()) ||
      !path.basename(root).startsWith('docmatrix-batch1-storage-')
    )
      throw new Error('Unsafe test cleanup path');
    try {
      const provider: LocalStorageProvider = Object.create(
        LocalStorageProvider.prototype,
      );
      (provider as any).baseDir = root;
      const service = new StorageService(
        { isAvailable: () => false } as any,
        provider,
        { scanBuffer: vi.fn(async () => ({ isClean: true })) } as any,
      );
      const uploaded = await service.uploadPatientDocument({
        clinicId: 'synthetic',
        patientId: 'synthetic',
        category: 'Consent',
        buffer: pdf,
        originalFilename: 'consent.pdf',
        claimedMimeType: 'application/pdf',
      });
      expect(
        (await service.getDocumentBuffer(uploaded.fileKey)).buffer.equals(pdf),
      ).toBe(true);
      expect(() =>
        service.validateFile(pdf, 'consent.png', 'image/png'),
      ).toThrow();
      expect(() =>
        service.validateFile(
          Buffer.from('not a PDF'),
          'consent.pdf',
          'application/pdf',
        ),
      ).toThrow();
      expect(() =>
        service.validateFile(
          Buffer.from('<svg/>'),
          'consent.xml',
          'image/svg+xml',
        ),
      ).toThrow();
    } finally {
      // Delete only the independently created test directory inside the OS temp directory.
      await fs.rm(root, { recursive: true });
    }
  });
});

describe.skipIf(!process.env.BATCH1_CLAMAV_HOST)(
  'Batch 1: real local ClamAV engine (optional)',
  () => {
    it('#10 recognizes EICAR and accepts a clean document through the real daemon', async () => {
      if (process.env.BATCH1_CLAMAV_HOST !== '127.0.0.1')
        throw new Error('Only a disposable local scanner may be used.');
      const adapter = new ClamAvScannerAdapter(
        '127.0.0.1',
        Number(process.env.BATCH1_CLAMAV_PORT || 3310),
      );
      expect((await adapter.scanStream(pdf)).isClean).toBe(true);
      const eicar = Buffer.from(
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',
      );
      expect((await adapter.scanStream(eicar)).isClean).toBe(false);
    });
  },
);
