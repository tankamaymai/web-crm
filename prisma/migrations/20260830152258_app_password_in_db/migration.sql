-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "passwordSalt" TEXT,
ADD COLUMN     "sessionSecret" TEXT;
