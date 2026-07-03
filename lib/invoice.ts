import { prisma } from "@/lib/prisma";
import { todayJST } from "@/lib/dates";

/** `INV-YYYYMM-NNN` 形式で当月の連番を採番する */
export async function nextInvoiceNumber(): Promise<string> {
  const today = todayJST();
  const ym = today.toISOString().slice(0, 7).replace("-", "");
  const prefix = `INV-${ym}-`;
  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  const lastSeq = last ? parseInt(last.invoiceNumber.slice(prefix.length), 10) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(3, "0")}`;
}

// ---- 消費税の計算モード ----
//
// インボイス未登録（免税事業者）の場合、買い手は消費税の全額を仕入税額控除
// できない（経過措置: 〜2026/9 は80%、2026/10〜2029/9 は50%、以降は0%）。
// 買い手の実質負担をインボイス登録事業者と揃えるための調整計算を選べる。
//
// 例）税抜45,000円・税率10%・控除割合80% の場合:
//   STANDARD:          49,500円（調整なし）
//   ADJUSTED_DISCOUNT: 48,600円（控除できない 900円 を値引き）
//   ADJUSTED_EXACT:    48,529円（相手の実質負担がちょうど 45,000円 になる額 = 45,000×110/102）

export const TAX_MODES = [
  "STANDARD",
  "ADJUSTED_DISCOUNT",
  "ADJUSTED_EXACT",
] as const;

export type TaxMode = (typeof TAX_MODES)[number];

export const TAX_MODE_LABELS: Record<string, string> = {
  STANDARD: "通常（税抜＋消費税）",
  ADJUSTED_DISCOUNT: "インボイス未登録調整：控除不可分を値引き",
  ADJUSTED_EXACT: "インボイス未登録調整：実質負担を税抜額に一致",
};

export const TAX_MODE_SHORT_LABELS: Record<string, string> = {
  STANDARD: "通常",
  ADJUSTED_DISCOUNT: "未登録調整（値引き）",
  ADJUSTED_EXACT: "未登録調整（厳密）",
};

/** 免税事業者からの仕入れに係る仕入税額控除の経過措置割合（発行日で自動判定） */
export function transitionalDeductionRate(issueDate: Date): number {
  const d = issueDate.toISOString().slice(0, 10);
  if (d < "2023-10-01") return 1;
  if (d < "2026-10-01") return 0.8;
  if (d < "2029-10-01") return 0.5;
  return 0;
}

export type InvoiceTotals = {
  subtotal: number;
  taxAmount: number;
  /** 経過措置調整による値引き額（負の値。調整なしなら0） */
  adjustment: number;
  total: number;
};

export function calcInvoiceTotals(
  items: { quantity: number; unitPrice: number }[],
  taxRate: number,
  taxMode: string = "STANDARD",
  issueDate?: Date | null
): InvoiceTotals {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const taxAmount = Math.floor((subtotal * taxRate) / 100);
  let adjustment = 0;
  if (taxMode === "ADJUSTED_DISCOUNT" || taxMode === "ADJUSTED_EXACT") {
    const rate = transitionalDeductionRate(issueDate ?? todayJST());
    if (taxMode === "ADJUSTED_DISCOUNT") {
      // 相手が控除できない分（税額 ×(1−控除割合)）をそのまま値引き
      adjustment = -Math.round(taxAmount * (1 - rate));
    } else {
      // 相手の実質負担 = T ×(1 − 税率/(100+税率)×控除割合) が税抜額と一致する T を請求
      // T = 税抜額 ×(100+税率)/(100+税率−税率×控除割合) 例: 10%・控除80% → ×110/102
      const total = Math.round(
        (subtotal * (100 + taxRate)) / (100 + taxRate - taxRate * rate)
      );
      adjustment = total - subtotal - taxAmount;
    }
  }
  return { subtotal, taxAmount, adjustment, total: subtotal + taxAmount + adjustment };
}
