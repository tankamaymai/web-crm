import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { requireAuth } from "@/lib/auth";
import { buildInvoiceXlsx } from "@/lib/invoiceDoc/buildInvoiceXlsx";
import { normalizeOverrides } from "@/lib/invoiceDoc/overrides";
import { normalizeLayout, STANDARD_LAYOUT } from "@/lib/documentFormat";
import { NextResponse } from "next/server";
import { contentDisposition, invoiceFileName } from "@/lib/invoiceDoc/fileName";

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

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": contentDisposition(
        "attachment",
        `${invoice.invoiceNumber}.xlsx`,
        invoiceFileName(invoice, "xlsx")
      ),
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}
