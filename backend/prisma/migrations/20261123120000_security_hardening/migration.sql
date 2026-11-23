ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMPTZ(6), ADD COLUMN "mfaSecret" TEXT, ADD COLUMN "mfaPendingSecret" TEXT, ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "mfaLastStep" BIGINT NOT NULL DEFAULT -1, ADD COLUMN "mfaRecoveryHashes" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "UserSession" ADD COLUMN "mfaVerifiedAt" TIMESTAMP(3);
ALTER TABLE "PatientConsent" ADD COLUMN "evidenceHash" TEXT, ADD COLUMN "revokedAt" TIMESTAMP(3);
ALTER TABLE "AuditEvent" ADD COLUMN "ipAddress" TEXT, ADD COLUMN "userAgent" TEXT, ADD COLUMN "forwardedAt" TIMESTAMP(3), ADD COLUMN "forwardAttempts" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "nextForwardAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "AuditEvent_forwardedAt_nextForwardAt_idx" ON "AuditEvent" ("forwardedAt", "nextForwardAt");
CREATE TABLE "ConsentRevision" ("id" TEXT NOT NULL, "consentId" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "actorId" TEXT NOT NULL, "action" TEXT NOT NULL, "snapshot" JSONB NOT NULL, "evidenceHash" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ConsentRevision_pkey" PRIMARY KEY ("id"));
CREATE INDEX "ConsentRevision_clinicId_consentId_createdAt_idx" ON "ConsentRevision" ("clinicId", "consentId", "createdAt");
CREATE TABLE "EmailVerification" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMPTZ(6) NOT NULL, "consumedAt" TIMESTAMPTZ(6), "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "EmailVerification_tokenHash_key" ON "EmailVerification" ("tokenHash");
CREATE INDEX "EmailVerification_userId_expiresAt_idx" ON "EmailVerification" ("userId", "expiresAt");
-- Application connections cannot overwrite or delete historical consent evidence.
CREATE FUNCTION protect_consent_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Consent revision history is append only'; END $$;
CREATE TRIGGER consent_revision_immutable BEFORE UPDATE OR DELETE ON "ConsentRevision" FOR EACH ROW EXECUTE FUNCTION protect_consent_revision();

ALTER TABLE "PatientConsent" ADD COLUMN "consentText" TEXT;
CREATE FUNCTION protect_audit_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF TG_OP = 'DELETE' OR (to_jsonb(NEW) - ARRAY['forwardedAt','forwardAttempts','nextForwardAt']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['forwardedAt','forwardAttempts','nextForwardAt']) THEN RAISE EXCEPTION 'Security audit history is append only'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER audit_event_immutable BEFORE UPDATE OR DELETE ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION protect_audit_event();

ALTER TABLE "Patient" ADD COLUMN "legalHold" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "retentionArchivedAt" TIMESTAMP(3);
