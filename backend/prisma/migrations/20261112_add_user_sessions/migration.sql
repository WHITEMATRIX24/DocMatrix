-- DocMatrix Security Implementation Phase 3: UserSession Migration
-- PREPARED MIGRATION — DO NOT EXECUTE AUTOMATICALLY AGAINST SHARED NEON DATABASE
-- Requires operator confirmation before deployment.

-- CreateTable "UserSession"
CREATE TABLE IF NOT EXISTS "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "previousTokenHashes" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revocationReason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_tokenHash_key" ON "UserSession"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserSession_userId_isRevoked_idx" ON "UserSession"("userId", "isRevoked");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserSession_familyId_idx" ON "UserSession"("familyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserSession_userId_fkey'
    ) THEN
        ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserSession_clinicId_fkey'
    ) THEN
        ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_clinicId_fkey"
            FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
