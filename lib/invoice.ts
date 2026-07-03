import { prisma } from "@/lib/prisma";
import { todayJST } from "@/lib/dates";
import type { InvoiceItem } from "@prisma/client";

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

export function calcInvoiceTotals(
  items: Pick<InvoiceItem, "quantity" | "unitPrice">[],
  taxRate: number
) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const taxAmount = Math.floor((subtotal * taxRate) / 100);
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}
