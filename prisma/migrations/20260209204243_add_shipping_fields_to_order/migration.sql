-- AlterEnum
ALTER TYPE "Category" ADD VALUE 'UNISEX';

-- AlterEnum
ALTER TYPE "SubSubCategory" ADD VALUE 'Gorros';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "receivedAt" TIMESTAMP(3),
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "shippingData" JSONB,
ADD COLUMN     "shippingProvider" TEXT,
ADD COLUMN     "shippingTicketUrl" TEXT,
ADD COLUMN     "shippingType" TEXT;
