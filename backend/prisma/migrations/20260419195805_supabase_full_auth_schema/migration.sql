/*
  Warnings:

  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "password";

-- CreateTable
CREATE TABLE "mechanic_company" (
    "mechanicId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mechanic_company_pkey" PRIMARY KEY ("mechanicId","companyId")
);

-- CreateIndex
CREATE INDEX "mechanic_company_companyId_idx" ON "mechanic_company"("companyId");

-- CreateIndex
CREATE INDEX "mechanic_company_mechanicId_idx" ON "mechanic_company"("mechanicId");

-- CreateIndex
CREATE INDEX "contracts_companyId_idx" ON "contracts"("companyId");

-- CreateIndex
CREATE INDEX "equipments_companyId_idx" ON "equipments"("companyId");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "invoices_companyId_idx" ON "invoices"("companyId");

-- CreateIndex
CREATE INDEX "invoices_contractId_idx" ON "invoices"("contractId");

-- CreateIndex
CREATE INDEX "invoices_createdById_idx" ON "invoices"("createdById");

-- CreateIndex
CREATE INDEX "maintenance_forms_equipmentId_idx" ON "maintenance_forms"("equipmentId");

-- CreateIndex
CREATE INDEX "maintenance_forms_mechanicId_idx" ON "maintenance_forms"("mechanicId");

-- CreateIndex
CREATE INDEX "maintenance_forms_contractId_idx" ON "maintenance_forms"("contractId");

-- CreateIndex
CREATE INDEX "maintenance_forms_createdById_idx" ON "maintenance_forms"("createdById");

-- CreateIndex
CREATE INDEX "maintenance_requests_equipmentId_idx" ON "maintenance_requests"("equipmentId");

-- CreateIndex
CREATE INDEX "maintenance_requests_userId_idx" ON "maintenance_requests"("userId");

-- CreateIndex
CREATE INDEX "maintenance_requests_mechanicId_idx" ON "maintenance_requests"("mechanicId");

-- CreateIndex
CREATE INDEX "maintenance_tire_forms_maintenanceFormId_idx" ON "maintenance_tire_forms"("maintenanceFormId");

-- CreateIndex
CREATE INDEX "maintenance_tire_forms_tireId_idx" ON "maintenance_tire_forms"("tireId");

-- CreateIndex
CREATE INDEX "maintenance_tires_maintenanceId_idx" ON "maintenance_tires"("maintenanceId");

-- CreateIndex
CREATE INDEX "maintenance_tires_tireId_idx" ON "maintenance_tires"("tireId");

-- CreateIndex
CREATE INDEX "maintenances_contractId_idx" ON "maintenances"("contractId");

-- CreateIndex
CREATE INDEX "mechanics_userId_idx" ON "mechanics"("userId");

-- CreateIndex
CREATE INDEX "rep_records_tireId_idx" ON "rep_records"("tireId");

-- CreateIndex
CREATE INDEX "rep_records_equipmentId_idx" ON "rep_records"("equipmentId");

-- CreateIndex
CREATE INDEX "rep_records_registeredById_idx" ON "rep_records"("registeredById");

-- CreateIndex
CREATE INDEX "tire_inspections_tireId_idx" ON "tire_inspections"("tireId");

-- CreateIndex
CREATE INDEX "tire_lifecycle_events_stockTireId_idx" ON "tire_lifecycle_events"("stockTireId");

-- CreateIndex
CREATE INDEX "tire_lifecycle_events_performedById_idx" ON "tire_lifecycle_events"("performedById");

-- CreateIndex
CREATE INDEX "tires_equipmentId_idx" ON "tires"("equipmentId");

-- CreateIndex
CREATE INDEX "users_companyId_idx" ON "users"("companyId");

-- AddForeignKey
ALTER TABLE "mechanic_company" ADD CONSTRAINT "mechanic_company_mechanicId_fkey" FOREIGN KEY ("mechanicId") REFERENCES "mechanics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mechanic_company" ADD CONSTRAINT "mechanic_company_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
