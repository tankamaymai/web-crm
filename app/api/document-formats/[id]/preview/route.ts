import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { requireAuth } from "@/lib/auth";
import { renderInvoicePdf } from "@/lib/pdf/renderInvoicePdf";
import type { InvoiceForPdf } from "@/lib/pdf/renderInvoicePdf";
import { todayJST, endOfNextMonth } from "@/lib/dates";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** 請求書がまだ1件も無いときのプレビュー用サンプル */
function sampleInvoice(): InvoiceForPdf {
  const issueDate = todayJST();
  const item = (description: string, quantity: number, unitPrice: number, i: number) => ({
    id: `sample-${i}`,
    description,
    quantity,
    unitPrice,
  });
  return {
    invoiceNumber: "SAMPLE-0001",
    client: { name: "山田 太郎", company: "サンプル株式会社" },
    issueDate,
    dueDate: endOfNextMonth(issueDate),
    taxRate: 10,
    taxMode: "STANDARD",
    honorific: "御中",
    notes: "（プレビュー用のサンプルです）",
    items: [
      item("Webサイト制作一式", 1, 330000, 0),
      item("保守管理費（月額）", 1, 22000, 1),
      item("追加ページ制作", 3, 16500, 2),
    ],
  };
}

/** 書式のプレビュー。最新の請求書（無ければサンプル）をその書式で表示する */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth();
  const { id } = await params;
  const format = await prisma.documentFormat.findUnique({ where: { id } });
  if (!format) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const latest = await prisma.invoice.findFirst({
    orderBy: { createdAt: "desc" },
    include: { client: true, items: { orderBy: { sortOrder: "asc" } } },
  });
  const buffer = await renderInvoicePdf(
    latest ?? sampleInvoice(),
    await getSettings(),
    format
  );
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="preview.pdf"; filename*=UTF-8''${encodeURIComponent(`${format.name} プレビュー.pdf`)}`,
    },
  });
}
