/*
  Warnings:

  - Changed the type of `condition` on the `Listing` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `category` on the `Listing` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('NUEVO_CON_ETIQUETA', 'NUEVO_SIN_ETIQUETA', 'MUY_BUENO', 'BUENO', 'SATISFACTORIO');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('HOMBRE', 'MUJER', 'NINOS', 'ACCESORIOS', 'CALZADOS', 'ROPA');

-- CreateEnum
CREATE TYPE "SubCategory" AS ENUM ('ROPA', 'ACCESORIOS', 'CALZADOS');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "size" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'available',
ADD COLUMN     "subCategory" "SubCategory",
ADD COLUMN     "subSubCategory" TEXT,
DROP COLUMN "condition",
ADD COLUMN     "condition" "Condition" NOT NULL,
DROP COLUMN "category",
ADD COLUMN     "category" "Category" NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "country" TEXT,
ALTER COLUMN "avatar" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Listing_category_idx" ON "Listing"("category");

-- CreateIndex
CREATE INDEX "Listing_subCategory_idx" ON "Listing"("subCategory");

-- CreateIndex
CREATE INDEX "Listing_condition_idx" ON "Listing"("condition");

-- CreateIndex
CREATE INDEX "Listing_brand_idx" ON "Listing"("brand");

-- CreateIndex
CREATE INDEX "Listing_price_idx" ON "Listing"("price");

-- CreateIndex
CREATE INDEX "Listing_createdAt_idx" ON "Listing"("createdAt");
