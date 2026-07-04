-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "Competition_parentId_idx" ON "Competition"("parentId");

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
