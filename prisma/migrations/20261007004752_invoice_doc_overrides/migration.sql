-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "docOverrides" JSONB NOT NULL DEFAULT '{}';
