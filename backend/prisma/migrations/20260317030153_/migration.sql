-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR', 'CLIENT');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'PENDING');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('TRUCK', 'LOADER', 'EXCAVATOR', 'CRANE', 'FORKLIFT', 'PICKUP', 'OTHER');

-- CreateEnum
CREATE TYPE "TireStatus" AS ENUM ('OK', 'WARNING', 'CRITICAL', 'REPLACED', 'RETIRED');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('INSPECTION', 'ROTATION', 'REPLACEMENT', 'PRESSURE_CHECK', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FormPhase" AS ENUM ('PRE', 'POST');

-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TireLifecycle" AS ENUM ('NEW_AVAILABLE', 'INSTALLED', 'WITHDRAWN', 'IN_REPAIR', 'REPAIRED_AVAILABLE', 'SCRAPPED');

-- CreateEnum
CREATE TYPE "LifecycleEventType" AS ENUM ('PURCHASE', 'INSTALL', 'WITHDRAW', 'START_REPAIR', 'FINISH_REPAIR', 'REINSTALL', 'SCRAP');

-- CreateEnum
CREATE TYPE "RepReason" AS ENUM ('WEAR', 'DAMAGE', 'PRESSURE', 'OTHER');

-- CreateEnum
CREATE TYPE "TireCondition" AS ENUM ('WORN', 'DAMAGED', 'REPAIRABLE');

-- CreateEnum
CREATE TYPE "RepStatus" AS ENUM ('REGISTERED', 'SENT_TO_DISPOSAL', 'CERTIFIED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('MONTHLY_FEE', 'MAINTENANCE', 'TIRE_SALE', 'REPAIR', 'OTHER', 'SERVICE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "monthlyValue" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EquipmentType" NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "licensePlate" TEXT,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mechanics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rut" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "speciality" TEXT,
    "certifications" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mechanics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tires" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "size" TEXT,
    "dot" TEXT,
    "installDate" TIMESTAMP(3),
    "lastInspection" TIMESTAMP(3),
    "currentDepth" DOUBLE PRECISION,
    "initialDepth" DOUBLE PRECISION,
    "pressure" DOUBLE PRECISION,
    "recommendedPressure" DOUBLE PRECISION,
    "mileage" INTEGER,
    "maxMileage" INTEGER,
    "purchasePrice" DOUBLE PRECISION,
    "maintenanceCost" DOUBLE PRECISION,
    "status" "TireStatus" NOT NULL DEFAULT 'OK',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_inspections" (
    "id" TEXT NOT NULL,
    "tireId" TEXT NOT NULL,
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inspectedBy" TEXT,
    "depth" DOUBLE PRECISION,
    "pressure" DOUBLE PRECISION,
    "mileage" INTEGER,
    "status" "TireStatus" NOT NULL,
    "observations" TEXT,
    "photoUrl" TEXT,

    CONSTRAINT "tire_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_requests" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "description" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenances" (
    "id" TEXT NOT NULL,
    "contractId" TEXT,
    "requestId" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "technician" TEXT,
    "type" "MaintenanceType" NOT NULL,
    "observations" TEXT,
    "nextScheduled" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_tires" (
    "id" TEXT NOT NULL,
    "maintenanceId" TEXT NOT NULL,
    "tireId" TEXT NOT NULL,
    "action" TEXT,
    "depthBefore" DOUBLE PRECISION,
    "depthAfter" DOUBLE PRECISION,
    "pressureBefore" DOUBLE PRECISION,
    "pressureAfter" DOUBLE PRECISION,

    CONSTRAINT "maintenance_tires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_forms" (
    "id" TEXT NOT NULL,
    "phase" "FormPhase" NOT NULL DEFAULT 'PRE',
    "status" "FormStatus" NOT NULL DEFAULT 'SCHEDULED',
    "type" "MaintenanceType" NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "mechanicId" TEXT,
    "contractId" TEXT,
    "createdById" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "plannedTires" TEXT,
    "notes" TEXT,
    "performedAt" TIMESTAMP(3),
    "observations" TEXT,
    "nextScheduled" TIMESTAMP(3),
    "signedByClient" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_tire_forms" (
    "id" TEXT NOT NULL,
    "maintenanceFormId" TEXT NOT NULL,
    "tireId" TEXT NOT NULL,
    "action" TEXT,
    "depthBefore" DOUBLE PRECISION,
    "depthAfter" DOUBLE PRECISION,
    "pressureBefore" DOUBLE PRECISION,
    "pressureAfter" DOUBLE PRECISION,
    "mileageBefore" INTEGER,
    "mileageAfter" INTEGER,
    "cost" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "maintenance_tire_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_tires" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT,
    "size" TEXT NOT NULL,
    "dot" TEXT,
    "purchasePrice" DOUBLE PRECISION,
    "notes" TEXT,
    "lifecycle" "TireLifecycle" NOT NULL DEFAULT 'NEW_AVAILABLE',
    "installCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_tires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_lifecycle_events" (
    "id" TEXT NOT NULL,
    "stockTireId" TEXT NOT NULL,
    "event" "LifecycleEventType" NOT NULL,
    "fromState" "TireLifecycle" NOT NULL,
    "toState" "TireLifecycle" NOT NULL,
    "equipmentId" TEXT,
    "equipmentName" TEXT,
    "position" TEXT,
    "repairCost" DOUBLE PRECISION,
    "salePrice" DOUBLE PRECISION,
    "notes" TEXT,
    "performedById" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tire_lifecycle_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rep_records" (
    "id" TEXT NOT NULL,
    "tireId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "retiredAt" TIMESTAMP(3) NOT NULL,
    "reason" "RepReason" NOT NULL DEFAULT 'WEAR',
    "condition" "TireCondition" NOT NULL DEFAULT 'WORN',
    "disposalPoint" TEXT,
    "disposalEntity" TEXT,
    "weightKg" DOUBLE PRECISION,
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "status" "RepStatus" NOT NULL DEFAULT 'REGISTERED',
    "registeredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rep_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contractId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0.19,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "sentTo" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "type" "ItemType" NOT NULL DEFAULT 'SERVICE',

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "companies_rut_key" ON "companies"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_number_key" ON "contracts"("number");

-- CreateIndex
CREATE UNIQUE INDEX "mechanics_rut_key" ON "mechanics"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "maintenances_requestId_key" ON "maintenances"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_tires_code_key" ON "stock_tires"("code");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipments" ADD CONSTRAINT "equipments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tires" ADD CONSTRAINT "tires_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_inspections" ADD CONSTRAINT "tire_inspections_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "tires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "maintenance_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tires" ADD CONSTRAINT "maintenance_tires_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "maintenances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tires" ADD CONSTRAINT "maintenance_tires_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "tires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_forms" ADD CONSTRAINT "maintenance_forms_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_forms" ADD CONSTRAINT "maintenance_forms_mechanicId_fkey" FOREIGN KEY ("mechanicId") REFERENCES "mechanics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_forms" ADD CONSTRAINT "maintenance_forms_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_forms" ADD CONSTRAINT "maintenance_forms_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tire_forms" ADD CONSTRAINT "maintenance_tire_forms_maintenanceFormId_fkey" FOREIGN KEY ("maintenanceFormId") REFERENCES "maintenance_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tire_forms" ADD CONSTRAINT "maintenance_tire_forms_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "tires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_lifecycle_events" ADD CONSTRAINT "tire_lifecycle_events_stockTireId_fkey" FOREIGN KEY ("stockTireId") REFERENCES "stock_tires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_lifecycle_events" ADD CONSTRAINT "tire_lifecycle_events_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rep_records" ADD CONSTRAINT "rep_records_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "tires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rep_records" ADD CONSTRAINT "rep_records_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rep_records" ADD CONSTRAINT "rep_records_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
