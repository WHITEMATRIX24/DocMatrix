import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { ClinicalController } from './clinical.controller.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { DocumentQueryDto } from './dto/document-query.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtStrategy } from '../auth/jwt.strategy.js';
import { SessionService } from '../auth/session.service.js';
import { getJwtSecret, JWT_ALGORITHM } from '../common/config/jwt.config.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { ClinicalService } from './clinical.service.js';
import { StorageService } from '../storage/storage.service.js';
import { LocalStorageProvider } from '../storage/local-storage.provider.js';
import { MalwareScannerService } from '../storage/malware-scanner.service.js';
const url = process.env.BATCH1_DATABASE_URL;
if (url) {
  const t = new URL(url);
  if (
    t.hostname !== '127.0.0.1' ||
    t.port !== '55440' ||
    t.username !== 'batch_security' ||
    t.searchParams.get('schema') !== 'batch1_security'
  )
    throw new Error('Disposable local database required.');
}
describe.skipIf(!url)(
  'Patient documents: PostgreSQL and real local storage',
  () => {
    let db: PrismaClient,
      service: ClinicalService,
      storage: StorageService,
      clinic: any,
      foreignClinic: any,
      patient: any,
      other: any,
      foreign: any,
      appointment: any,
      actor: any;
    let app: INestApplication;
    const keys = new Set<string>();
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
    beforeAll(async () => {
      db = new PrismaClient({ datasources: { db: { url } } });
      const makeClinic = () =>
        db.clinic.create({
          data: {
            name: 'Synthetic documents',
            slug: randomUUID(),
            email: 'test@example.test',
            phone: '000',
            status: 'ACTIVE',
          },
        });
      clinic = await makeClinic();
      foreignClinic = await makeClinic();
      const makePatient = (clinicId: string, patientCode: string) =>
        db.patient.create({
          data: {
            clinicId,
            patientCode,
            firstName: 'Synthetic',
            lastName: 'Patient',
            mobile: '000',
            dateOfBirth: new Date('2000-01-01'),
          },
        });
      patient = await makePatient(clinic.id, 'DOC-P1');
      other = await makePatient(clinic.id, 'DOC-P2');
      foreign = await makePatient(foreignClinic.id, 'DOC-P1');
      actor = await db.user.create({
        data: {
          clinicId: clinic.id,
          fullName: 'Reception',
          email: `${randomUUID()}@example.test`,
          passwordHash: 'no-login',
          role: 'RECEPTIONIST',
          emailVerifiedAt: new Date(),
          mfaEnabled: true,
        },
      });
      appointment = await db.appointment.create({
        data: {
          clinicId: clinic.id,
          patientId: patient.id,
          startTime: new Date('2030-01-01T10:00Z'),
          endTime: new Date('2030-01-01T10:30Z'),
          durationMinutes: 30,
          treatmentType: 'Restoration',
        },
      });
      storage = new StorageService(
        { isAvailable: () => false } as any,
        new LocalStorageProvider(),
        new MalwareScannerService(),
      );
      service = new ClinicalService(db as any, storage);
      Reflect.defineMetadata(
        'design:paramtypes',
        [ClinicalService],
        ClinicalController,
      );
      Reflect.defineMetadata(
        'design:paramtypes',
        [Object, String, CreateDocumentDto, Object],
        ClinicalController.prototype,
        'createDocument',
      );
      Reflect.defineMetadata(
        'design:paramtypes',
        [Object, String, DocumentQueryDto],
        ClinicalController.prototype,
        'getDocuments',
      );
      const sessions = new SessionService(db as any);
      const fixture = await Test.createTestingModule({
        imports: [PassportModule],
        controllers: [ClinicalController],
        providers: [
          { provide: ClinicalService, useValue: service },
          { provide: PrismaService, useValue: db },
          {
            provide: JwtStrategy,
            useValue: new JwtStrategy(db as any, sessions),
          },
        ],
      }).compile();
      app = fixture.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
      );
      await app.init();
    }, 60000);
    afterAll(async () => {
      await app?.close();
      for (const key of keys) await storage.deleteDocument(key);
      await db?.$disconnect();
    });
    const upload = async (extra: any = {}) => {
      const doc = await service.createDocument(
        clinic.id,
        patient.id,
        {
          title: 'OPG scan',
          category: 'Dental X-rays',
          imagingType: 'OPG',
          appointmentId: appointment.id,
          toothNumbers: [11, 48],
          documentDate: '2026-11-27',
          ...extra,
        },
        { buffer: pdf, originalname: 'opg.pdf', mimetype: 'application/pdf' },
        actor,
      );
      keys.add(
        (await db.patientDocument.findUniqueOrThrow({ where: { id: doc.id } }))
          .fileKey,
      );
      return doc;
    };
    it('stores scanned metadata, appointment and original bytes for doctor retrieval', async () => {
      const doc = await upload();
      expect(doc).toMatchObject({
        patientId: 'DOC-P1',
        uploadedById: actor.id,
        imagingType: 'OPG',
        sizeBytes: pdf.length,
      });
      expect(
        (
          await service.downloadDocument(clinic.id, patient.id, doc.id, {
            ...actor,
            role: 'DOCTOR',
          })
        ).buffer,
      ).toEqual(pdf);
      expect(
        await service.getDocuments(clinic.id, patient.id, actor, {
          appointmentId: appointment.id,
        }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: doc.id,
            appointment: expect.objectContaining({
              treatmentType: 'Restoration',
            }),
          }),
        ]),
      );
      expect(
        await db.auditEvent.count({
          where: { clinicId: clinic.id, action: 'DOCUMENT_UPLOADED' },
        }),
      ).toBeGreaterThan(0);
      expect(
        JSON.stringify(
          await service.getDocument(clinic.id, patient.id, doc.id, actor),
        ),
      ).not.toMatch(/signedUrl|fileKey|https:/);
    });
    it('rejects cross-patient and cross-clinic relationships and retrieval', async () => {
      const doc = await upload();
      await expect(
        service.getDocument(clinic.id, other.id, doc.id, actor),
      ).rejects.toThrow('not found');
      await expect(
        service.downloadDocument(foreignClinic.id, foreign.id, doc.id, actor),
      ).rejects.toThrow('not found');
      await expect(
        service.createDocument(
          clinic.id,
          other.id,
          {
            title: 'Wrong',
            category: 'Medical Reports',
            appointmentId: appointment.id,
          },
          { buffer: pdf, originalname: 'r.pdf' },
          actor,
        ),
      ).rejects.toThrow('does not belong');
      await expect(
        service.createDocument(
          foreignClinic.id,
          patient.id,
          { title: 'Wrong', category: 'Medical Reports' },
          { buffer: pdf, originalname: 'r.pdf' },
          actor,
        ),
      ).rejects.toThrow('Patient not found');
    });
    it('enforces appointment ownership in PostgreSQL independently', async () => {
      await expect(
        db.patientDocument.create({
          data: {
            clinicId: clinic.id,
            patientId: other.id,
            appointmentId: appointment.id,
            title: 'Wrong',
            category: 'Medical Reports',
            fileName: 'r.pdf',
            fileSize: '1 KB',
            fileKey: 'never-stored',
          },
        }),
      ).rejects.toThrow();
    });
    it('archives and restores without deleting bytes or audit history', async () => {
      const doc = await upload(),
        admin = { ...actor, role: 'BRANCH_ADMIN' };
      await expect(
        service.deleteDocument(clinic.id, patient.id, doc.id, actor),
      ).rejects.toThrow('administrator');
      await service.deleteDocument(clinic.id, patient.id, doc.id, admin);
      await expect(
        service.downloadDocument(clinic.id, patient.id, doc.id, actor),
      ).rejects.toThrow('not found');
      expect(
        await service.getDocuments(clinic.id, patient.id, admin, {
          archived: 'true',
        }),
      ).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: doc.id })]),
      );
      await service.setDocumentArchived(
        clinic.id,
        patient.id,
        doc.id,
        false,
        admin,
      );
      expect(
        (await service.downloadDocument(clinic.id, patient.id, doc.id, actor))
          .buffer,
      ).toEqual(pdf);
      expect(
        await db.auditEvent.count({
          where: {
            clinicId: clinic.id,
            action: { in: ['DOCUMENT_ARCHIVED', 'DOCUMENT_RESTORED'] },
          },
        }),
      ).toBe(2);
    });
    it('deduplicates retries', async () => {
      const uploadRequestId = randomUUID(),
        first = await upload({ uploadRequestId }),
        retry = await upload({ uploadRequestId });
      expect(retry.id).toBe(first.id);
      expect(
        await db.patientDocument.count({
          where: { clinicId: clinic.id, uploadRequestId },
        }),
      ).toBe(1);
    });
    it('serves the receptionist-to-doctor workflow over real JWT authenticated HTTP', async () => {
      const sessions = new SessionService(db as any),
        jwt = new JwtService({
          secret: getJwtSecret(),
          signOptions: { algorithm: JWT_ALGORITHM },
        });
      const tokenFor = async (user: any) => {
        const { session } = await sessions.createSession(
          user.id,
          user.clinicId,
        );
        return jwt.sign({ sub: user.id, sessionId: session.id });
      };
      const makeUser = async (role: any, clinicId = clinic.id) =>
        db.user.create({
          data: {
            clinicId,
            role,
            fullName: role,
            email: `${randomUUID()}@example.test`,
            passwordHash: 'no-login',
            mfaEnabled: true,
            emailVerifiedAt: new Date(),
          },
        });
      const reception = await tokenFor(actor),
        doctor = await tokenFor(await makeUser('DOCTOR')),
        foreignToken = await tokenFor(
          await makeUser('DOCTOR', foreignClinic.id),
        ),
        accountant = await tokenFor(await makeUser('ACCOUNTANT'));
      const path = `/patients/${patient.id}/documents`;
      expect((await request(app.getHttpServer()).get(path)).status).toBe(401);
      expect(
        (
          await request(app.getHttpServer())
            .get(path)
            .auth(accountant, { type: 'bearer' })
        ).status,
      ).toBe(403);
      const result = await request(app.getHttpServer())
        .post(path)
        .auth(reception, { type: 'bearer' })
        .field('title', 'HTTP OPG')
        .field('category', 'Dental X-rays')
        .field('imagingType', 'OPG')
        .field('toothNumbers', '[11,48]')
        .field('appointmentId', appointment.id)
        .attach('file', pdf, 'scan.pdf');
      expect(result.status, JSON.stringify(result.body)).toBe(201);
      const id = result.body.id;
      keys.add(
        (await db.patientDocument.findUniqueOrThrow({ where: { id } })).fileKey,
      );
      expect(result.body).toMatchObject({
        title: 'HTTP OPG',
        uploadedById: actor.id,
        toothNumbers: [11, 48],
      });
      const list = await request(app.getHttpServer())
        .get(path)
        .query({ appointmentId: appointment.id })
        .auth(doctor, { type: 'bearer' });
      expect(list.status).toBe(200);
      expect(list.body).toEqual(
        expect.arrayContaining([expect.objectContaining({ id })]),
      );
      const preview = await request(app.getHttpServer())
        .get(`${path}/${id}/preview?redirect=true`)
        .auth(doctor, { type: 'bearer' });
      expect(preview.status).toBe(200);
      expect(preview.body).toEqual(pdf);
      expect(preview.headers['cache-control']).toBe('no-store');
      expect(preview.headers.location).toBeUndefined();
      const download = await request(app.getHttpServer())
        .get(`${path}/${id}/download?redirect=true`)
        .auth(doctor, { type: 'bearer' });
      expect(download.status).toBe(200);
      expect(download.body).toEqual(pdf);
      expect(download.headers['content-disposition']).toMatch(/^attachment/);
      expect(download.headers.location).toBeUndefined();
      expect(
        (
          await request(app.getHttpServer())
            .get(`${path}/${id}`)
            .auth(foreignToken, { type: 'bearer' })
        ).status,
      ).toBe(404);
      expect(
        (
          await request(app.getHttpServer())
            .get(`/patients/${other.id}/documents/${id}`)
            .auth(doctor, { type: 'bearer' })
        ).status,
      ).toBe(404);
      expect(
        (
          await request(app.getHttpServer())
            .delete(`${path}/${id}`)
            .auth(reception, { type: 'bearer' })
        ).status,
      ).toBe(403);
    });
  },
);
