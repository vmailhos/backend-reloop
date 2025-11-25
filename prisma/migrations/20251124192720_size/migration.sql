/*
  Warnings:

  - You are about to drop the column `size` on the `Listing` table. All the data in the column will be lost.
  - The `subSubCategory` column on the `Listing` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "SubSubCategory" AS ENUM ('Todos', 'Remeras', 'Camisas', 'Tops', 'Pantalones', 'Bermudas', 'Shorts', 'Camperas', 'Vestidos', 'Buzos', 'Faldas', 'Blazers', 'Carteras', 'Sombreros', 'Lentes', 'Bijou', 'Cinturones', 'Guantes', 'Bufandas', 'Joyas', 'Sandalias', 'Botas', 'Zapatillas', 'Tacos');

-- CreateEnum
CREATE TYPE "TopSize" AS ENUM ('TS_XXS', 'TS_XS', 'TS_S', 'TS_M', 'TS_L', 'TS_XL', 'TS_XXL', 'TS_XXXL', 'TS_U');

-- CreateEnum
CREATE TYPE "BottomSize" AS ENUM ('TB_XXS', 'TB_XS', 'TB_S', 'TB_M', 'TB_L', 'TB_XL', 'TB_XXL', 'TB_U', 'TB_30', 'TB_32', 'TB_34', 'TB_36', 'TB_38', 'TB_40', 'TB_42', 'TB_44', 'TB_46', 'TB_48');

-- CreateEnum
CREATE TYPE "ShoeSize" AS ENUM ('SH_33', 'SH_34', 'SH_35', 'SH_36', 'SH_37', 'SH_38', 'SH_39', 'SH_40', 'SH_41', 'SH_42', 'SH_43', 'SH_44', 'SH_45', 'SH_46');

-- CreateEnum
CREATE TYPE "KidsSize" AS ENUM ('K_0_3M', 'K_3_6M', 'K_6_9M', 'K_9_12M', 'K_12_18M', 'K_18_24M', 'K_2', 'K_3', 'K_4', 'K_5', 'K_6', 'K_7', 'K_8', 'K_10', 'K_12', 'K_14', 'K_16');

-- CreateEnum
CREATE TYPE "KidsShoeSize" AS ENUM ('KS_16', 'KS_17', 'KS_18', 'KS_19', 'KS_20', 'KS_21', 'KS_22', 'KS_23', 'KS_24', 'KS_25', 'KS_26', 'KS_27', 'KS_28', 'KS_29', 'KS_30', 'KS_31', 'KS_32', 'KS_33');

-- CreateEnum
CREATE TYPE "AccessorySize" AS ENUM ('A_U', 'A_S', 'A_M', 'A_L', 'A_XL');

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "size",
ADD COLUMN     "sizeAccessory" "AccessorySize",
ADD COLUMN     "sizeBottom" "BottomSize",
ADD COLUMN     "sizeKids" "KidsSize",
ADD COLUMN     "sizeKidsShoe" "KidsShoeSize",
ADD COLUMN     "sizeShoe" "ShoeSize",
ADD COLUMN     "sizeTop" "TopSize",
DROP COLUMN "subSubCategory",
ADD COLUMN     "subSubCategory" "SubSubCategory";

-- DropEnum
DROP TYPE "public"."subSubCategory";
