import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { renderInvoicePdf } from "@/lib/pdf/renderInvoicePdf";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { contentDisposition, invoiceFileName } from "@/lib/invoiceDoc/fileName";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
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

  const buffer = await renderInvoicePdf(invoice, settings, invoice.format);

  // ?download=1 のときは、ブラウザのPDF表示を経由せず直接ダウンロードさせる
  const download = new URL(request.url).searchParams.get("download") === "1";
  const fileName = invoiceFileName(invoice, "pdf");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition(
        download ? "attachment" : "inline",
        `${invoice.invoiceNumber}.pdf`,
        fileName
      ),
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}
