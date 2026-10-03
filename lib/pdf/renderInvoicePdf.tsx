import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentFormat, Settings } from "@prisma/client";
import InvoicePdf, { type InvoiceForPdf } from "./InvoicePdf";
import FormattedInvoicePdf from "./FormattedInvoicePdf";
import { normalizeLayout } from "@/lib/documentFormat";

/** 書式が指定されていればその見た目で、無ければアプリ標準の見た目でPDFを作る */
export function renderInvoicePdf(
  invoice: InvoiceForPdf,
  settings: Settings,
  format: DocumentFormat | null
) {
  return renderToBuffer(
    format ? (
      <FormattedInvoicePdf
        invoice={invoice}
        settings={settings}
        layout={normalizeLayout(format.layout)}
      />
    ) : (
      <InvoicePdf invoice={invoice} settings={settings} />
    )
  );
}
