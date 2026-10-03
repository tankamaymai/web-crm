-- 請求書の宛名の敬称（様 / 御中）。既存の請求書はこれまでどおり「様」
ALTER TABLE "Invoice" ADD COLUMN "honorific" TEXT NOT NULL DEFAULT '様';
