/*
  Warnings:

  - The `subSubCategory` column on the `Listing` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "subSubCategory" AS ENUM ('Todos', 'Remeras', 'Camisas', 'Tops', 'Pantalones', 'Bermudas', 'Shorts', 'Camperas', 'Vestidos', 'Buzos', 'Faldas', 'Blazers', 'Carteras', 'Sombreros', 'Lentes', 'Bijou', 'Cinturones', 'Guantes', 'Bufandas', 'Joyas', 'Sandalias', 'Botas', 'Zapatillas', 'Tacos');

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "subSubCategory",
ADD COLUMN     "subSubCategory" "subSubCategory";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "listingId" TEXT,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
