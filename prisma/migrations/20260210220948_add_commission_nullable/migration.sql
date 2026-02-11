/*
  Warnings:

  - Added the required column `commission` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "commission" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "commissionPct" DECIMAL(65,30) NOT NULL DEFAULT 3.0,
ADD COLUMN     "subtotal" DECIMAL(65,30) NOT NULL,
ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(65,30);
