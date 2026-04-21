/*
  Warnings:

  - You are about to drop the `mechanic_companies` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `mechanics` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "mechanic_companies" DROP CONSTRAINT "mechanic_companies_companyId_fkey";

-- DropForeignKey
ALTER TABLE "mechanic_companies" DROP CONSTRAINT "mechanic_companies_mechanicId_fkey";

-- AlterTable
ALTER TABLE "mechanics" ADD COLUMN     "userId" TEXT;

-- DropTable
DROP TABLE "mechanic_companies";

-- CreateIndex
CREATE UNIQUE INDEX "mechanics_userId_key" ON "mechanics"("userId");

-- AddForeignKey
ALTER TABLE "mechanics" ADD CONSTRAINT "mechanics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
