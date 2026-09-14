-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "recurring" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "monthlyGoal" INTEGER NOT NULL DEFAULT 0;
