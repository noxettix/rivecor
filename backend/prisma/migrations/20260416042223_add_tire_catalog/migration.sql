-- CreateTable
CREATE TABLE "tire_catalog" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "retread1Cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retread2Cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "repairCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depthNew" DOUBLE PRECISION NOT NULL,
    "depthMin" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tire_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tire_catalog_brand_model_size_key" ON "tire_catalog"("brand", "model", "size");
