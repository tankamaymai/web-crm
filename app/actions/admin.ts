"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * 過去データ修正用の一時アクション（一回限りの使用を想定）。
 *
 * サービス開始時に、既に入金済みの過去案件をまとめて登録・発行・入金済み
 * 処理したため、請求書の発行日・入金日が実際の作業時期ではなく登録日
 * （本日）になってしまっていた。案件の期限（期日）を実際の日付とみなし、
 * 入金済み請求書の発行日・入金日をそこに合わせて補正する。
 */
export async function fixHistoricalPaidInvoiceDates() {
  const invoices = await prisma.invoice.findMany({
    where: { status: "PAID", projectId: { not: null } },
    include: { project: true },
  });

  let updated = 0;
  const skipped: string[] = [];

  for (const invoice of invoices) {
    const dueDate = invoice.project?.dueDate;
    if (!dueDate) {
      skipped.push(invoice.invoiceNumber);
      continue;
    }
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { issueDate: dueDate, paidAt: dueDate },
    });
    updated++;
  }

  revalidatePath("/");
  revalidatePath("/invoices");

  return { updated, skipped, total: invoices.length };
}
