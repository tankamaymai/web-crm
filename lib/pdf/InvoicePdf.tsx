import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { calcInvoiceTotals, transitionalDeductionRate } from "@/lib/invoice";
import { formatDate } from "@/lib/dates";
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

// 単語内で折り返すとreact-pdfがハイフンを挿入するため、単語単位を維持する。
// 長文は表示側で行を分けること。
Font.registerHyphenationCallback((word) => [word]);

const DARK = "#3f3f3f";
const BORDER = "#8a8a8a";

// 明細表の最低行数（空行で埋めてテンプレートらしい見た目にする）
const MIN_TABLE_ROWS = 10;

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    fontSize: 9,
    paddingVertical: 44,
    paddingHorizontal: 46,
    color: "#111111",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 10,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  clientNameBox: {
    minWidth: 240,
    borderBottomWidth: 1.2,
    borderBottomColor: "#111111",
    paddingBottom: 3,
  },
  clientName: {
    fontSize: 14,
    fontWeight: "bold",
  },
  metaTable: { width: 180 },
  metaRow: { flexDirection: "row", marginBottom: 3 },
  metaLabel: { width: 64, fontWeight: "bold" },
  metaValue: { flex: 1, textAlign: "right" },
  greeting: { marginBottom: 10 },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  leftCol: { width: 300 },
  payBlock: {
    borderWidth: 0.8,
    borderColor: BORDER,
  },
  payRow: {
    flexDirection: "row",
    borderBottomWidth: 0.8,
    borderBottomColor: BORDER,
  },
  payRowLast: { flexDirection: "row" },
  payLabel: {
    width: 62,
    backgroundColor: DARK,
    color: "#ffffff",
    fontWeight: "bold",
    textAlign: "center",
    paddingVertical: 5,
  },
  payValue: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  feeNote: { fontSize: 7.5, color: "#333333", marginTop: 3 },

  totalBigRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 12,
  },
  totalBigLabel: {
    width: 62,
    backgroundColor: DARK,
    color: "#ffffff",
    fontWeight: "bold",
    textAlign: "center",
    paddingVertical: 8,
    fontSize: 10,
  },
  totalBigValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: "bold",
    textAlign: "center",
    paddingVertical: 6,
    borderBottomWidth: 1.2,
    borderBottomColor: "#111111",
  },

  issuerBlock: { width: 200, paddingTop: 2 },
  issuerName: { fontSize: 13, fontWeight: "bold", marginBottom: 6 },
  issuerLine: { marginBottom: 2, lineHeight: 1.4 },

  table: {
    borderWidth: 0.8,
    borderColor: BORDER,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: DARK,
    color: "#ffffff",
    fontWeight: "bold",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 0.8,
    borderTopColor: BORDER,
  },
  cellDesc: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRightWidth: 0.8,
    borderRightColor: BORDER,
  },
  cellQty: {
    width: 60,
    paddingVertical: 4,
    paddingHorizontal: 6,
    textAlign: "center",
    borderRightWidth: 0.8,
    borderRightColor: BORDER,
  },
  cellPrice: {
    width: 90,
    paddingVertical: 4,
    paddingHorizontal: 6,
    textAlign: "right",
    borderRightWidth: 0.8,
    borderRightColor: BORDER,
  },
  cellAmount: {
    width: 100,
    paddingVertical: 4,
    paddingHorizontal: 6,
    textAlign: "right",
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  taxTable: {
    width: 260,
    borderWidth: 0.8,
    borderColor: BORDER,
  },
  taxHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#d9d9d9",
    fontWeight: "bold",
  },
  taxRow: {
    flexDirection: "row",
    borderTopWidth: 0.8,
    borderTopColor: BORDER,
  },
  taxCellLabel: {
    width: 80,
    paddingVertical: 3,
    paddingHorizontal: 6,
    textAlign: "right",
    borderRightWidth: 0.8,
    borderRightColor: BORDER,
  },
  taxCellValue: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 6,
    textAlign: "right",
  },
  taxCellValueBordered: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 6,
    textAlign: "right",
    borderRightWidth: 0.8,
    borderRightColor: BORDER,
  },

  sumBlock: { width: 200 },
  sumRow: {
    flexDirection: "row",
    borderWidth: 0.8,
    borderColor: BORDER,
    marginBottom: -0.8,
  },
  sumLabel: {
    width: 92,
    backgroundColor: DARK,
    color: "#ffffff",
    fontWeight: "bold",
    textAlign: "center",
    paddingVertical: 4,
  },
  sumValue: {
    flex: 1,
    textAlign: "right",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  sumTotalValue: { fontWeight: "bold" },

  notesHeader: {
    backgroundColor: DARK,
    color: "#ffffff",
    fontWeight: "bold",
    textAlign: "center",
    paddingVertical: 4,
  },
  notesBox: {
    borderWidth: 0.8,
    borderColor: BORDER,
    borderTopWidth: 0,
    minHeight: 60,
    padding: 8,
    lineHeight: 1.5,
  },
  adjustNote: { fontSize: 7.5, color: "#333333", marginTop: 4 },
});

export type InvoiceForPdf = Invoice & { client: Client; items: InvoiceItem[] };

function yen(n: number): string {
  return n.toLocaleString("ja-JP");
}

export default function InvoicePdf({
  invoice,
  settings,
}: {
  invoice: InvoiceForPdf;
  settings: Settings;
}) {
  const { subtotal, taxAmount, adjustment, total } = calcInvoiceTotals(
    invoice.items,
    invoice.taxRate,
    invoice.taxMode,
    invoice.issueDate
  );
  const adjusted = invoice.taxMode !== "STANDARD" && adjustment !== 0;
  const deductionPercent = Math.round(
    transitionalDeductionRate(invoice.issueDate) * 100
  );
  const clientLabel = invoice.client.company
    ? `${invoice.client.company} ${invoice.client.name} 様`
    : `${invoice.client.name} 様`;
  const bankLines = (settings.bankInfo ?? "").split("\n").filter(Boolean);

  // 税率別内訳（10% / 軽減8% / 0% の3行。それ以外の税率は1行目を置き換える）
  const knownRates = [10, 8, 0];
  const breakdownRows = (
    knownRates.includes(invoice.taxRate) ? knownRates : [invoice.taxRate, 8, 0]
  ).map((rate, i) => ({
    label: rate === 8 && i === 1 ? "軽減8%対象" : `${rate}%対象`,
    subtotal: rate === invoice.taxRate ? subtotal : 0,
    tax: rate === invoice.taxRate ? taxAmount : 0,
  }));

  const fillerCount = Math.max(0, MIN_TABLE_ROWS - invoice.items.length);

  return (
    <Document
      title={`御請求書 ${invoice.invoiceNumber}`}
      author={settings.businessName || undefined}
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>御 請 求 書</Text>

        <View style={styles.headerRow}>
          <View style={styles.clientNameBox}>
            <Text style={styles.clientName}>{clientLabel}</Text>
          </View>
          <View style={styles.metaTable}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>発行日</Text>
              <Text style={styles.metaValue}>{formatDate(invoice.issueDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>請求No.</Text>
              <Text style={styles.metaValue}>{invoice.invoiceNumber}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.greeting}>下記のとおり、御請求申し上げます。</Text>

        <View style={styles.infoRow}>
          <View style={styles.leftCol}>
            <View style={styles.payBlock}>
              <View style={styles.payRow}>
                <Text style={styles.payLabel}>支払期限</Text>
                <Text style={styles.payValue}>
                  {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
                </Text>
              </View>
              <View style={styles.payRowLast}>
                <Text style={styles.payLabel}>振込先</Text>
                <View style={styles.payValue}>
                  {bankLines.length > 0 ? (
                    bankLines.map((line, i) => <Text key={i}>{line}</Text>)
                  ) : (
                    <Text> </Text>
                  )}
                  <Text style={styles.feeNote}>
                    ※ 振込手数料は貴社ご負担にてお願い申し上げます。
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.totalBigRow}>
              <Text style={styles.totalBigLabel}>合計</Text>
              <Text style={styles.totalBigValue}>{yen(total)} 円 (税込)</Text>
            </View>
          </View>

          <View style={styles.issuerBlock}>
            <Text style={styles.issuerName}>{settings.businessName}</Text>
            {settings.postalCode && (
              <Text style={styles.issuerLine}>〒{settings.postalCode}</Text>
            )}
            {settings.address && (
              <Text style={styles.issuerLine}>{settings.address}</Text>
            )}
            {settings.phone && (
              <Text style={styles.issuerLine}>TEL：{settings.phone}</Text>
            )}
            {settings.email && (
              <Text style={styles.issuerLine}>{settings.email}</Text>
            )}
            {settings.registrationNumber && (
              <Text style={styles.issuerLine}>
                登録番号：{settings.registrationNumber}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.cellDesc}>摘要</Text>
            <Text style={styles.cellQty}>数量</Text>
            <Text style={styles.cellPrice}>単価</Text>
            <Text style={styles.cellAmount}>金額(税抜)</Text>
          </View>
          {invoice.items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.cellDesc}>{item.description}</Text>
              <Text style={styles.cellQty}>{item.quantity}</Text>
              <Text style={styles.cellPrice}>{yen(item.unitPrice)}</Text>
              <Text style={styles.cellAmount}>
                {yen(item.quantity * item.unitPrice)}
              </Text>
            </View>
          ))}
          {Array.from({ length: fillerCount }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.tableRow}>
              <Text style={styles.cellDesc}> </Text>
              <Text style={styles.cellQty}> </Text>
              <Text style={styles.cellPrice}> </Text>
              <Text style={styles.cellAmount}> </Text>
            </View>
          ))}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.taxTable}>
            <View style={styles.taxHeaderRow}>
              <Text style={styles.taxCellLabel}>税率別内訳</Text>
              <Text style={styles.taxCellValueBordered}>税抜金額</Text>
              <Text style={styles.taxCellValue}>消費税額</Text>
            </View>
            {breakdownRows.map((row) => (
              <View key={row.label} style={styles.taxRow}>
                <Text style={styles.taxCellLabel}>{row.label}</Text>
                <Text style={styles.taxCellValueBordered}>
                  {yen(row.subtotal)}
                </Text>
                <Text style={styles.taxCellValue}>{yen(row.tax)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sumBlock}>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>小計(税抜)</Text>
              <Text style={styles.sumValue}>{yen(subtotal)}</Text>
            </View>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>
                {adjusted ? "消費税相当額" : "消費税"}
              </Text>
              <Text style={styles.sumValue}>{yen(taxAmount)}</Text>
            </View>
            {adjusted && (
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>調整値引き</Text>
                <Text style={styles.sumValue}>-{yen(-adjustment)}</Text>
              </View>
            )}
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>合計</Text>
              <Text style={[styles.sumValue, styles.sumTotalValue]}>
                {yen(total)}
              </Text>
            </View>
          </View>
        </View>

        <View>
          <Text style={styles.notesHeader}>備考</Text>
          <View style={styles.notesBox}>
            {invoice.notes ? <Text>{invoice.notes}</Text> : <Text> </Text>}
            {adjusted && (
              <View style={styles.adjustNote}>
                <Text>
                  ※ 当方はインボイス（適格請求書発行事業者）未登録のため、
                </Text>
                <Text>
                  仕入税額控除の対象とならない消費税相当分を調整値引きしています（経過措置による控除割合
                  {deductionPercent}%）。
                </Text>
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}
