import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import InvoicePdf from "@/lib/pdf/InvoicePdf";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth();
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { client: true, items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!invoice) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const settings = await getSettings();

  const buffer = await renderToBuffer(
    <InvoicePdf invoice={invoice} settings={settings} />
  );

  // 保存時のファイル名: 「取引先名 御請求書 9月分.pdf」（月は発行日の月）
  const clientName = invoice.client.company || invoice.client.name;
  const month = invoice.issueDate.getUTCMonth() + 1;
  const fileName = `${clientName} 御請求書 ${month}月分.pdf`.replace(
    /[\\/:*?"<>|]/g,
    "_"
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      // 日本語ファイル名は filename* で渡し、古いブラウザ向けに英数字名も添える
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
