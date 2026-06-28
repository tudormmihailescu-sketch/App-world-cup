-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "lastSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "decidedBy" TEXT,
ADD COLUMN     "finalAwayScore" INTEGER,
ADD COLUMN     "finalHomeScore" INTEGER;
