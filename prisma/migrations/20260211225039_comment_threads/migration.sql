/*
  Warnings:

  - You are about to drop the column `listingId` on the `Comment` table. All the data in the column will be lost.
  - Added the required column `threadId` to the `Comment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_listingId_fkey";

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "listingId",
ADD COLUMN     "threadId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "CommentThread" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentThread_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommentThread_listingId_buyerId_key" ON "CommentThread"("listingId", "buyerId");

-- AddForeignKey
ALTER TABLE "CommentThread" ADD CONSTRAINT "CommentThread_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentThread" ADD CONSTRAINT "CommentThread_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentThread" ADD CONSTRAINT "CommentThread_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CommentThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
