import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import InvoicePdf from "@/lib/pdf/InvoicePdf";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
