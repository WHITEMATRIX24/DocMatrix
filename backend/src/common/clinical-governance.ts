import { ForbiddenException } from '@nestjs/common';

export async function prescriptionPolicy(db: any, clinicId: string, userId: string, sessionId: string | undefined, diagnosis: string) {
  const clinic = await db.clinic.findUnique({ where: { id: clinicId }, select: { clinicalConfig: true } });
  const policy = clinic?.clinicalConfig?.governancePolicies || {};
  if (policy.mandatoryDiagnosisBeforeRx !== false && !diagnosis?.trim()) throw new ForbiddenException('A diagnosis is required before finalizing a prescription.');
  if (policy.twoFactorForPrescriptions) {
    const session = sessionId && await db.userSession.findFirst({ where: { id: sessionId, userId, clinicId, isRevoked: false, expiresAt: { gt: new Date() }, mfaVerifiedAt: { gt: new Date(Date.now() - 5 * 60000) } } });
    if (!session) throw new ForbiddenException('Verify a new authenticator code before finalizing this prescription.');
  }
}

export async function surgeryConsentPolicy(db: any, clinicId: string, patientId: string, procedure: { category?: string; procedureName?: string }) {
  const clinic = await db.clinic.findUnique({ where: { id: clinicId }, select: { clinicalConfig: true } });
  if (!/surg|extract|implant|odontectomy|apicoectomy|gingivectomy/i.test(`${procedure.category || ''} ${procedure.procedureName || ''}`)) return;
  if (clinic?.clinicalConfig?.governancePolicies?.mandatoryConsentForSurgery === false) return;
  // Catalogue categories identify surgery; names provide a conservative fallback for legacy entries.
  if (!/surg|extract|implant|odontectomy|apicoectomy|gingivectomy/i.test(`${procedure.category || ''} ${procedure.procedureName || ''}`)) return;
  const consent = await db.patientConsent.findFirst({
    where: {
      clinicId,
      patientId,
      status: { in: ['Signed', 'PATIENT_SIGNED', 'DENTIST_VERIFIED', 'COMPLETED'] },
      revokedAt: null,
      cancelledAt: null,
      OR: [
        { consentType: { equals: procedure.procedureName || '__missing__', mode: 'insensitive' } },
        { procedureName: { equals: procedure.procedureName || '__missing__', mode: 'insensitive' } },
        { consentText: { contains: procedure.procedureName || '__missing__', mode: 'insensitive' } },
      ],
      evidenceHash: { not: null },
      AND: [
        {
          OR: [
            { signatureData: { not: null } },
            { patientSignature: { not: null } },
            { guardianSignature: { not: null } },
          ],
        },
      ],
    },
  });
  if (!consent) throw new ForbiddenException('A signed consent with preserved evidence is required before starting surgery.');
}
