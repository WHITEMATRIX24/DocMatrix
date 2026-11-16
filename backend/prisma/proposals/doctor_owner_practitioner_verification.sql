-- PROPOSAL ONLY: not an installed migration. Do not execute without approval.
-- Administrative StaffRole remains unchanged. No owner/admin is backfilled.
-- Application support must be reviewed and deployed with the approved migration.
-- A trusted verifier must confirm practitioner eligibility out of band;
-- staff CRUD must not accept or set these fields.
ALTER TABLE "User"
  ADD COLUMN "practitionerVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "practitionerVerifiedById" TEXT;

ALTER TABLE "User"
  ADD CONSTRAINT "User_practitionerVerifiedById_fkey"
    FOREIGN KEY ("practitionerVerifiedById") REFERENCES "User"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "User_practitioner_verification_pair_check"
    CHECK (
      ("practitionerVerifiedAt" IS NULL AND "practitionerVerifiedById" IS NULL)
      OR ("practitionerVerifiedAt" IS NOT NULL AND "practitionerVerifiedById" IS NOT NULL
          AND "practitionerVerifiedById" <> "id")
    );
-- The future server policy must check current verification plus clinical
-- eligibility at each prescription mutation/signature, not a cached JWT flag.
-- Verification/revocation must be platform-only, audited, and revoke sessions.
