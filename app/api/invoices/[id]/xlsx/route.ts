import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { requireAuth } from "@/lib/auth";
import { buildInvoiceXlsx } from "@/lib/invoiceDoc/buildInvoiceXlsx";
import { normalizeOverrides } from "@/lib/invoiceDoc/overrides";
import { normalizeLayout, STANDARD_LAYOUT } from "@/lib/documentFormat";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth();
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      items: { orderBy: { sortOrder: "asc" } },
      format: true,
    },
  });
  if (!invoice) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const settings = await getSettings();
  const layout = invoice.format ? normalizeLayout(invoice.format.layout) : STANDARD_LAYOUT;
  const buffer = await buildInvoiceXlsx(
    invoice,
    settings,
    layout,
    normalizeOverrides(invoice.docOverrides)
  );

  // 保存時のファイル名はPDFと同じ「取引先名 御請求書 ◯月分」
  const clientName = invoice.client.company || invoice.client.name;
  const month = invoice.issueDate.getUTCMonth() + 1;
  const fileName = `${clientName} 御請求書 ${month}月分.xlsx`.replace(/[\\/:*?"<>|]/g, "_");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
