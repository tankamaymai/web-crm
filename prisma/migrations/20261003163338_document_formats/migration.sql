-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "formatId" TEXT;

-- CreateTable
CREATE TABLE "DocumentFormat" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layout" JSONB NOT NULL,
    "sourceFileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentFormat_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_formatId_fkey" FOREIGN KEY ("formatId") REFERENCES "DocumentFormat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
