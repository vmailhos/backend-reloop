/*
  Warnings:

  - Added the required column `updatedAt` to the `Offer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "OfferStatus" ADD VALUE 'EXPIRED';

-- DropForeignKey
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_buyerId_fkey";

-- DropForeignKey
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_listingId_fkey";

-- DropForeignKey
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_sellerId_fkey";

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "acceptedPrice" DECIMAL(10,2),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Offer_buyerId_createdAt_idx" ON "Offer"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "Offer_sellerId_createdAt_idx" ON "Offer"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "Offer_listingId_createdAt_idx" ON "Offer"("listingId", "createdAt");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
