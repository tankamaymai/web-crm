import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { calcInvoiceTotals } from "@/lib/invoice";
import { formatDate, formatYen } from "@/lib/dates";
import type { Client, Invoice, InvoiceItem, Settings } from "@prisma/client";
import path from "path";

const fontDir = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "NotoSansJP",
  fonts: [
    { src: path.join(fontDir, "NotoSansJP-Regular.ttf"), fontWeight: "normal" },
    { src: path.join(fontDir, "NotoSansJP-Bold.ttf"), fontWeight: "bold" },
  ],
});

// 数字の3桁区切りカンマ等でハイフネーションされないようにする
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    fontSize: 9,
    padding: 40,
    color: "#1a1a2e",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  clientName: {
    fontSize: 13,
    fontWeight: "bold",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a2e",
    paddingBottom: 4,
    marginBottom: 8,
  },
  meta: { textAlign: "right", lineHeight: 1.6 },
  issuer: { textAlign: "right", lineHeight: 1.6, marginTop: 12 },
  issuerName: { fontSize: 11, fontWeight: "bold" },
  totalBox: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#1a1a2e",
    paddingBottom: 6,
    marginBottom: 24,
    width: 280,
  },
  totalLabel: { fontSize: 11 },
  totalValue: { fontSize: 18, fontWeight: "bold" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#334155",
    color: "#ffffff",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  colDesc: { flex: 1 },
  colQty: { width: 50, textAlign: "right" },
  colPrice: { width: 90, textAlign: "right" },
  colAmount: { width: 90, textAlign: "right" },
  sumRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  sumLabel: { width: 140, textAlign: "right", color: "#475569" },
  sumValue: { width: 90, textAlign: "right" },
  grandTotal: { fontWeight: "bold", fontSize: 11 },
  footerBox: {
    marginTop: 24,
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    padding: 10,
    lineHeight: 1.6,
  },
  footerTitle: { fontWeight: "bold", marginBottom: 4 },
});

export type InvoiceForPdf = Invoice & { client: Client; items: InvoiceItem[] };

export default function InvoicePdf({
  invoice,
  settings,
}: {
  invoice: InvoiceForPdf;
  settings: Settings;
}) {
  const { subtotal, taxAmount, total } = calcInvoiceTotals(
    invoice.items,
    invoice.taxRate
  );
  const clientLabel = invoice.client.company
    ? `${invoice.client.company} ${invoice.client.name} 様`
    : `${invoice.client.name} 様`;

  return (
    <Document
      title={`請求書 ${invoice.invoiceNumber}`}
      author={settings.businessName || undefined}
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>請求書</Text>

        <View style={styles.headerRow}>
          <View style={{ width: 260 }}>
            <Text style={styles.clientName}>{clientLabel}</Text>
            <Text>下記の通りご請求申し上げます。</Text>
          </View>
          <View>
            <View style={styles.meta}>
              <Text>請求書番号: {invoice.invoiceNumber}</Text>
              <Text>発行日: {formatDate(invoice.issueDate)}</Text>
              {invoice.dueDate && (
                <Text>お支払期限: {formatDate(invoice.dueDate)}</Text>
              )}
            </View>
            <View style={styles.issuer}>
              <Text style={styles.issuerName}>{settings.businessName}</Text>
              {settings.postalCode && <Text>〒{settings.postalCode}</Text>}
              {settings.address && <Text>{settings.address}</Text>}
              {settings.phone && <Text>TEL: {settings.phone}</Text>}
              {settings.email && <Text>{settings.email}</Text>}
              {settings.registrationNumber && (
                <Text>登録番号: {settings.registrationNumber}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>ご請求金額（税込）</Text>
          <Text style={styles.totalValue}>{formatYen(total)}</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>品目</Text>
          <Text style={styles.colQty}>数量</Text>
          <Text style={styles.colPrice}>単価</Text>
          <Text style={styles.colAmount}>金額</Text>
        </View>
        {invoice.items.map((item) => (
          <View key={item.id} style={styles.tableRow}>
            <Text style={styles.colDesc}>{item.description}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colPrice}>{formatYen(item.unitPrice)}</Text>
            <Text style={styles.colAmount}>
              {formatYen(item.quantity * item.unitPrice)}
            </Text>
          </View>
        ))}

        <View style={{ marginTop: 8 }}>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>小計（税抜）</Text>
            <Text style={styles.sumValue}>{formatYen(subtotal)}</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>
              {invoice.taxRate}%対象 消費税
            </Text>
            <Text style={styles.sumValue}>{formatYen(taxAmount)}</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={[styles.sumLabel, styles.grandTotal]}>
              合計（税込）
            </Text>
            <Text style={[styles.sumValue, styles.grandTotal]}>
              {formatYen(total)}
            </Text>
          </View>
        </View>

        {settings.bankInfo && (
          <View style={styles.footerBox}>
            <Text style={styles.footerTitle}>お振込先</Text>
            <Text>{settings.bankInfo}</Text>
            <Text style={{ color: "#475569", marginTop: 4 }}>
              恐れ入りますが、振込手数料はお客様にてご負担願います。
            </Text>
          </View>
        )}

        {invoice.notes && (
          <View style={styles.footerBox}>
            <Text style={styles.footerTitle}>備考</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
