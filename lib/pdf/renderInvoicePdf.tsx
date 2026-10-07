import { Document, Page, renderToBuffer, Text, View } from "@react-pdf/renderer";
import type { DocumentFormat, Settings } from "@prisma/client";
import InvoiceDocument, {
  pageStyle,
  type DocInvoice,
} from "@/lib/invoiceDoc/InvoiceDocument";
import { normalizeOverrides } from "@/lib/invoiceDoc/overrides";
import { normalizeLayout, STANDARD_LAYOUT } from "@/lib/documentFormat";
import "./fonts";

export type InvoiceForPdf = DocInvoice & { docOverrides?: unknown };

/** 書式（無ければ標準）と、プレビューで書き換えた内容を反映してPDFを作る */
export function renderInvoicePdf(
  invoice: InvoiceForPdf,
  settings: Settings,
  format: DocumentFormat | null
) {
  const layout = format ? normalizeLayout(format.layout) : STANDARD_LAYOUT;
  return renderToBuffer(
    <Document
      title={`${layout.documentTitle} ${invoice.invoiceNumber}`}
      author={settings.businessName || undefined}
    >
      <Page size="A4" style={pageStyle(layout)}>
        <InvoiceDocument
          invoice={invoice}
          issuer={settings}
          layout={layout}
          overrides={normalizeOverrides(invoice.docOverrides)}
          Box={({ style, children, wrap }) => (
            <View style={style} wrap={wrap}>
              {children}
            </View>
          )}
          renderField={(spec) => (
            <Text key={spec.k} style={spec.style}>
              {spec.value || " "}
            </Text>
          )}
        />
      </Page>
    </Document>
  );
}
