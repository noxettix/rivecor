-- CreateTable
CREATE TABLE "mechanic_companies" (
    "id" TEXT NOT NULL,
    "mechanicId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mechanic_companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mechanic_companies_mechanicId_companyId_key" ON "mechanic_companies"("mechanicId", "companyId");

-- AddForeignKey
ALTER TABLE "mechanic_companies" ADD CONSTRAINT "mechanic_companies_mechanicId_fkey" FOREIGN KEY ("mechanicId") REFERENCES "mechanics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mechanic_companies" ADD CONSTRAINT "mechanic_companies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
