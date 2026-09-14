-- 請求書の案件紐付けを「明細行ごと」に移す。
-- 1枚の請求書に複数案件の明細をまとめられるようにするため。

-- 1) 明細に案件カラムを追加
ALTER TABLE "InvoiceItem" ADD COLUMN "projectId" TEXT;

-- 2) 既存データの引き継ぎ: 請求書に紐づいていた案件を、その請求書の全明細にコピーする
UPDATE "InvoiceItem" AS item
SET "projectId" = inv."projectId"
FROM "Invoice" AS inv
WHERE item."invoiceId" = inv."id"
  AND inv."projectId" IS NOT NULL;

-- 3) 請求書側の案件カラムを削除
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_projectId_fkey";
ALTER TABLE "Invoice" DROP COLUMN "projectId";

-- 4) 明細 → 案件の外部キー
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
