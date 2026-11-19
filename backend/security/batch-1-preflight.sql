-- Operator-run compatibility inspection only. Never repairs or deletes records.
BEGIN TRANSACTION READ ONLY;

SELECT 'invoice_appointment_scope_mismatch' AS check_name, COUNT(*) AS affected
FROM "Invoice" i JOIN "Appointment" a ON a."id" = i."appointmentId"
WHERE i."clinicId" <> a."clinicId" OR i."patientId" <> a."patientId";

SELECT 'duplicate_active_treatment_item_reservations' AS check_name, COUNT(*) AS affected
FROM (
  SELECT li."treatmentPlanItemId" FROM "InvoiceLineItem" li
  JOIN "Invoice" i ON i."id" = li."invoiceId"
  WHERE i."status" <> 'VOID' AND li."treatmentPlanItemId" IS NOT NULL
  GROUP BY li."treatmentPlanItemId" HAVING COUNT(*) > 1
) duplicates;

SELECT 'inventory_item_batch_total_mismatch' AS check_name, COUNT(*) AS affected
FROM (
  SELECT i."id" FROM "InventoryItem" i
  LEFT JOIN "InventoryBatch" b ON b."itemId" = i."id" AND b."clinicId" = i."clinicId"
  GROUP BY i."id", i."totalStock" HAVING i."totalStock" <> COALESCE(SUM(b."quantity"), 0)
) mismatches;

SELECT 'duplicate_inventory_batch_numbers' AS check_name, COUNT(*) AS affected
FROM (
  SELECT "clinicId", "itemId", "batchNumber" FROM "InventoryBatch"
  GROUP BY "clinicId", "itemId", "batchNumber" HAVING COUNT(*) > 1
) duplicates;

SELECT 'negative_inventory_stock' AS check_name,
  (SELECT COUNT(*) FROM "InventoryItem" WHERE "totalStock" < 0) +
  (SELECT COUNT(*) FROM "InventoryBatch" WHERE "quantity" < 0) AS affected;

COMMIT;
