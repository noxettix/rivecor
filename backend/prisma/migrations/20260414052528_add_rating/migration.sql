/*
  Warnings:

  - The values [SCHEDULED,IN_PROGRESS] on the enum `RequestStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RequestStatus_new" AS ENUM ('PENDING', 'ACCEPTED', 'EN_ROUTE', 'COMPLETED', 'CANCELLED');
ALTER TABLE "maintenance_requests" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "maintenance_requests" ALTER COLUMN "status" TYPE "RequestStatus_new" USING ("status"::text::"RequestStatus_new");
ALTER TYPE "RequestStatus" RENAME TO "RequestStatus_old";
ALTER TYPE "RequestStatus_new" RENAME TO "RequestStatus";
DROP TYPE "RequestStatus_old";
ALTER TABLE "maintenance_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "maintenance_requests" DROP CONSTRAINT "maintenance_requests_equipmentId_fkey";

-- AlterTable
ALTER TABLE "maintenance_requests" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "comment" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "enRouteAt" TIMESTAMP(3),
ADD COLUMN     "mechanicId" TEXT,
ADD COLUMN     "rating" INTEGER,
ALTER COLUMN "equipmentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_mechanicId_fkey" FOREIGN KEY ("mechanicId") REFERENCES "mechanics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
