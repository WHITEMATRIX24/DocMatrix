ALTER TABLE "Appointment"
  ADD COLUMN "bookingRef" TEXT,
  ADD COLUMN "revisitOfId" TEXT,
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "rescheduleHistory" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "statusHistory" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "checkInTime" TIMESTAMPTZ(6),
  ADD COLUMN "consultationStartTime" TIMESTAMPTZ(6),
  ADD COLUMN "completedTime" TIMESTAMPTZ(6);
CREATE UNIQUE INDEX "Appointment_id_clinicId_key" ON "Appointment"("id", "clinicId");
CREATE UNIQUE INDEX "Appointment_clinicId_bookingRef_key" ON "Appointment"("clinicId", "bookingRef");
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_revisitOfId_clinicId_fkey"
  FOREIGN KEY ("revisitOfId", "clinicId") REFERENCES "Appointment"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;
