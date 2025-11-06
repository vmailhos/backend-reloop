-- AlterEnum (safe)
BEGIN;

-- 1. Create the new enum with the correct values
CREATE TYPE "Category_new" AS ENUM ('HOMBRE', 'MUJER', 'NINOS');

-- 2. Fix any existing data that has invalid enum values
--    You can choose the default category (here I use 'HOMBRE' as example)
UPDATE "Listing"
SET "category" = 'HOMBRE'
WHERE "category" NOT IN ('HOMBRE', 'MUJER', 'NINOS');

-- 3. Now safely change the column type
ALTER TABLE "Listing"
ALTER COLUMN "category" TYPE "Category_new"
USING ("category"::text::"Category_new");

-- 4. Replace the old enum with the new one
ALTER TYPE "Category" RENAME TO "Category_old";
ALTER TYPE "Category_new" RENAME TO "Category";
DROP TYPE "public"."Category_old";

COMMIT;

