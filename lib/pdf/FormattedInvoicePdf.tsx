import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type { ReactNode } from "react";
import type { Settings } from "@prisma/client";
import {
  calcInvoiceTotals,
  exclusiveUnitPrice,
  recipientLabel,
  transitionalDeductionRate,
} from "@/lib/invoice";
import { formatDate } from "@/lib/dates";
import type { ColumnKey, DocumentLayout } from "@/lib/documentFormat";
import type { InvoiceForPdf } from "./InvoicePdf";
import "./fonts";

function yen(n: number): string {
  return n.toLocaleString("ja-JP");
}

/** 取り込んだ書式（DocumentLayout）で請求書を描画する */
export default function FormattedInvoicePdf({
  invoice,
  settings,
  layout: L,
}: {
  invoice: InvoiceForPdf;
  settings: Settings;
  layout: DocumentLayout;
}) {
  const { subtotal, taxAmount, adjustment, total } = calcInvoiceTotals(
    invoice.items,
    invoice.taxRate,
    invoice.taxMode,
    invoice.issueDate
  );
  const adjusted = invoice.taxMode !== "STANDARD" && adjustment !== 0;
  const bankLines = (settings.bankInfo ?? "").split("\n").filter(Boolean);
  const fs = L.baseFontSize;
  const line = { borderColor: L.borderColor, borderWidth: 0.8 };
  const filled: Style = {
    backgroundColor: L.accentColor,
    color: L.accentTextColor,
    fontWeight: "bold",
  };

  // ---------- 各パーツ ----------

  const title = (
    <View
      style={{
        marginBottom: 16,
        alignItems:
          L.titleAlign === "left"
            ? "flex-start"
            : L.titleAlign === "right"
              ? "flex-end"
              : "center",
        ...(L.titleStyle === "band"
          ? { ...filled, paddingVertical: 6 }
          : L.titleStyle === "boxed"
            ? { ...line, paddingVertical: 6 }
            : {}),
      }}
    >
      <Text
        style={{
          fontSize: L.titleFontSize,
          fontWeight: "bold",
          letterSpacing: L.titleLetterSpacing,
          ...(L.titleStyle === "underline"
            ? {
                borderBottomWidth: 1.5,
                borderBottomColor: L.textColor,
                paddingHorizontal: 12,
                paddingBottom: 2,
              }
            : {}),
        }}
      >
        {L.documentTitle}
      </Text>
    </View>
  );

  const recipient = (
    <View
      style={{
        marginBottom: 10,
        paddingBottom: 3,
        ...(L.recipientStyle === "underline"
          ? { borderBottomWidth: 1.2, borderBottomColor: L.textColor }
          : L.recipientStyle === "boxed"
            ? { ...line, padding: 6 }
            : {}),
      }}
    >
      <Text style={{ fontSize: L.recipientFontSize, fontWeight: "bold" }}>
        {recipientLabel(invoice.client, invoice.honorific)}
      </Text>
    </View>
  );

  const greeting = L.greetingText ? (
    <Text style={{ marginBottom: 10 }}>{L.greetingText}</Text>
  ) : null;

  const totalBox = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "stretch",
        marginBottom: 12,
        ...(L.total.style === "boxed" ? line : {}),
      }}
    >
      <Text
        style={{
          paddingVertical: 7,
          paddingHorizontal: 10,
          fontSize: fs + 1,
          textAlign: "center",
          ...(L.total.style === "band" ? filled : { fontWeight: "bold" }),
        }}
      >
        {L.total.label}
      </Text>
      <Text
        style={{
          flex: 1,
          fontSize: fs + 6,
          fontWeight: "bold",
          textAlign: "center",
          paddingVertical: 5,
          ...(L.total.style === "band" || L.total.style === "underline"
            ? { borderBottomWidth: 1.2, borderBottomColor: L.textColor }
            : {}),
        }}
      >
        ¥{yen(total)} {L.total.suffix}
      </Text>
    </View>
  );

  const dueDateText = invoice.dueDate ? formatDate(invoice.dueDate) : "—";
  const bankBody = (
    <View>
      {bankLines.length > 0 ? (
        bankLines.map((l, i) => <Text key={i}>{l}</Text>)
      ) : (
        <Text> </Text>
      )}
      {L.payment.feeNote ? (
        <Text style={{ fontSize: fs - 1.5, marginTop: 3 }}>
          {L.payment.feeNote}
        </Text>
      ) : null}
    </View>
  );
  const payment =
    L.payment.style === "labeled-table" ? (
      <View style={{ ...line, marginBottom: 12 }}>
        <View
          style={{
            flexDirection: "row",
            borderBottomWidth: 0.8,
            borderBottomColor: L.borderColor,
          }}
        >
          <Text style={{ ...filled, width: 62, textAlign: "center", paddingVertical: 4 }}>
            {L.payment.dueDateLabel}
          </Text>
          <Text style={{ flex: 1, paddingVertical: 4, paddingHorizontal: 6 }}>
            {dueDateText}
          </Text>
        </View>
        <View style={{ flexDirection: "row" }}>
          <Text style={{ ...filled, width: 62, textAlign: "center", paddingVertical: 4 }}>
            {L.payment.bankLabel}
          </Text>
          <View style={{ flex: 1, paddingVertical: 4, paddingHorizontal: 6 }}>
            {bankBody}
          </View>
        </View>
      </View>
    ) : (
      <View style={{ marginBottom: 12 }}>
        <Text style={{ marginBottom: 3 }}>
          <Text style={{ fontWeight: "bold" }}>{L.payment.dueDateLabel}：</Text>
          {dueDateText}
        </Text>
        <Text style={{ fontWeight: "bold" }}>{L.payment.bankLabel}：</Text>
        {bankBody}
      </View>
    );

  const metaValue = (key: (typeof L.metaFields)[number]["key"]) =>
    key === "issueDate"
      ? formatDate(invoice.issueDate)
      : key === "invoiceNumber"
        ? invoice.invoiceNumber
        : dueDateText;
  const meta = (
    <View style={{ marginBottom: 10 }}>
      {L.metaFields.map((m) => (
        <View key={m.key} style={{ flexDirection: "row", marginBottom: 2 }}>
          <Text style={{ width: 64, fontWeight: "bold" }}>{m.label}</Text>
          <Text style={{ flex: 1, textAlign: "right" }}>{metaValue(m.key)}</Text>
        </View>
      ))}
    </View>
  );

  const issuerLines = [
    settings.postalCode ? `〒${settings.postalCode}` : null,
    settings.address,
    settings.phone ? `TEL：${settings.phone}` : null,
    settings.email,
    L.issuer.showRegistrationNumber && settings.registrationNumber
      ? `${L.issuer.registrationLabel}：${settings.registrationNumber}`
      : null,
  ].filter((l): l is string => Boolean(l));
  const issuer = (
    <View style={{ marginBottom: 8, textAlign: L.issuer.align }}>
      <Text style={{ fontSize: fs + 4, fontWeight: "bold", marginBottom: 5 }}>
        {settings.businessName}
      </Text>
      {issuerLines.map((l, i) => (
        <Text key={i} style={{ marginBottom: 2 }}>
          {l}
        </Text>
      ))}
    </View>
  );

  const seal = (
    <View
      style={{
        width: 52,
        height: 52,
        ...line,
        alignSelf: L.issuer.align === "right" ? "flex-end" : "flex-start",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
      }}
    >
      <Text style={{ color: L.borderColor, fontSize: fs - 1 }}>印</Text>
    </View>
  );

  const parts: Record<string, ReactNode> = {
    recipient,
    greeting,
    total: totalBox,
    payment,
    meta,
    issuer,
    seal,
  };

  const header = (
    <View
      style={{
        flexDirection: L.header.recipientSide === "left" ? "row" : "row-reverse",
        justifyContent: "space-between",
        marginBottom: 12,
      }}
    >
      <View style={{ width: "56%" }}>
        {L.header.recipientColumn.map((k) => (
          <View key={k}>{parts[k]}</View>
        ))}
      </View>
      <View style={{ width: "38%" }}>
        {L.header.issuerColumn.map((k) => (
          <View key={k}>{parts[k]}</View>
        ))}
      </View>
    </View>
  );

  // ---------- 明細表 ----------

  const cellValue = (
    key: ColumnKey,
    item: InvoiceForPdf["items"][number],
    index: number
  ): string => {
    const excl = exclusiveUnitPrice(item.unitPrice, invoice.taxRate);
    switch (key) {
      case "no":
        return String(index + 1);
      case "description":
        return item.description;
      case "quantity":
        return String(item.quantity);
      case "unitPriceExcl":
        return yen(excl);
      case "unitPriceIncl":
        return yen(item.unitPrice);
      case "amountExcl":
        return yen(item.quantity * excl);
      case "amountIncl":
        return yen(item.quantity * item.unitPrice);
    }
  };
  const cols = L.table.columns;
  const cellStyle = (i: number): Style => ({
    flex: cols[i].width,
    textAlign: cols[i].align,
    paddingVertical: 4,
    paddingHorizontal: 5,
    ...(i < cols.length - 1
      ? { borderRightWidth: 0.8, borderRightColor: L.borderColor }
      : {}),
  });
  const headerRowStyle: Style =
    L.table.headerStyle === "filled"
      ? filled
      : L.table.headerStyle === "underline"
        ? { fontWeight: "bold", borderBottomWidth: 1.2, borderBottomColor: L.textColor }
        : { fontWeight: "bold" };
  const filler = Math.max(0, L.table.minRows - invoice.items.length);
  const rows = [
    ...invoice.items.map((item, i) => cols.map((c) => cellValue(c.key, item, i))),
    ...Array.from({ length: filler }, () => cols.map(() => " ")),
  ];
  const items = (
    <View style={{ ...line, marginBottom: 10 }}>
      <View style={{ flexDirection: "row", ...headerRowStyle }}>
        {cols.map((c, i) => (
          <Text key={c.key} style={{ ...cellStyle(i), textAlign: "center" }}>
            {c.label}
          </Text>
        ))}
      </View>
      {rows.map((cells, r) => (
        <View
          key={r}
          wrap={false}
          style={{
            flexDirection: "row",
            borderTopWidth: 0.8,
            borderTopColor: L.borderColor,
            ...(L.table.zebra && r % 2 === 1 ? { backgroundColor: "#f3f4f6" } : {}),
          }}
        >
          {cells.map((v, i) => (
            <Text key={i} style={cellStyle(i)}>
              {v}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );

  // ---------- 合計欄・税率別内訳 ----------

  const summaryValue = (key: (typeof L.summary.rows)[number]["key"]) =>
    key === "subtotal"
      ? yen(subtotal)
      : key === "tax"
        ? yen(taxAmount)
        : key === "adjustment"
          ? `-${yen(-adjustment)}`
          : yen(total);
  const summaryRows = L.summary.rows.filter(
    (r) => r.key !== "adjustment" || adjusted
  );
  const sums = (
    <View style={{ width: 210, ...(L.summary.style === "boxed" ? line : {}) }}>
      {summaryRows.map((r) => (
        <View
          key={r.key}
          style={{
            flexDirection: "row",
            ...(L.summary.style === "filled-label"
              ? { ...line, marginBottom: -0.8 }
              : { borderBottomWidth: 0.8, borderBottomColor: L.borderColor }),
          }}
        >
          <Text
            style={{
              width: 92,
              paddingVertical: 4,
              textAlign: "center",
              ...(L.summary.style === "filled-label" ? filled : { fontWeight: "bold" }),
            }}
          >
            {r.key === "tax" && invoice.taxMode !== "STANDARD"
              ? "消費税相当額"
              : r.label}
          </Text>
          <Text
            style={{
              flex: 1,
              textAlign: "right",
              paddingVertical: 4,
              paddingHorizontal: 6,
              fontWeight: r.key === "total" ? "bold" : "normal",
            }}
          >
            {summaryValue(r.key)}
          </Text>
        </View>
      ))}
    </View>
  );
  const taxBreakdown = (
    <View style={{ width: 250, ...line }}>
      <View style={{ flexDirection: "row", backgroundColor: "#e5e5e5", fontWeight: "bold" }}>
        <Text style={{ width: 80, padding: 3, textAlign: "center" }}>税率別内訳</Text>
        <Text style={{ flex: 1, padding: 3, textAlign: "center" }}>税抜金額</Text>
        <Text style={{ flex: 1, padding: 3, textAlign: "center" }}>消費税額</Text>
      </View>
      <View style={{ flexDirection: "row", borderTopWidth: 0.8, borderTopColor: L.borderColor }}>
        <Text style={{ width: 80, padding: 3, textAlign: "right" }}>
          {invoice.taxRate}%対象
        </Text>
        <Text style={{ flex: 1, padding: 3, textAlign: "right" }}>{yen(subtotal)}</Text>
        <Text style={{ flex: 1, padding: 3, textAlign: "right" }}>{yen(taxAmount)}</Text>
      </View>
    </View>
  );
  const summary = (
    <View
      style={{
        flexDirection: L.summary.align === "right" ? "row" : "row-reverse",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 14,
      }}
      wrap={false}
    >
      {L.summary.showTaxBreakdown ? taxBreakdown : <View />}
      {sums}
    </View>
  );

  // ---------- 備考 ----------

  const deductionPercent = Math.round(
    transitionalDeductionRate(invoice.issueDate) * 100
  );
  const notesBody = (
    <View style={{ lineHeight: 1.5 }}>
      {invoice.notes ? <Text>{invoice.notes}</Text> : <Text> </Text>}
      {adjusted && (
        <Text style={{ fontSize: fs - 1.5, marginTop: 4 }}>
          ※ 当方はインボイス（適格請求書発行事業者）未登録のため、仕入税額控除の対象とならない消費税相当分を調整値引きしています（経過措置による控除割合
          {deductionPercent}%）。
        </Text>
      )}
    </View>
  );
  const notes =
    L.notes.style === "header-band" ? (
      <View wrap={false}>
        <Text style={{ ...filled, textAlign: "center", paddingVertical: 4 }}>
          {L.notes.label}
        </Text>
        <View style={{ ...line, borderTopWidth: 0, minHeight: 60, padding: 8 }}>
          {notesBody}
        </View>
      </View>
    ) : L.notes.style === "boxed" ? (
      <View style={{ ...line, minHeight: 60, padding: 8 }} wrap={false}>
        <Text style={{ fontWeight: "bold", marginBottom: 4 }}>{L.notes.label}</Text>
        {notesBody}
      </View>
    ) : (
      <View wrap={false}>
        <Text style={{ fontWeight: "bold", marginBottom: 4 }}>{L.notes.label}</Text>
        {notesBody}
      </View>
    );

  const sections: Record<string, ReactNode> = {
    title,
    header,
    greeting,
    total: totalBox,
    payment,
    items,
    summary,
    notes,
  };

  return (
    <Document
      title={`${L.documentTitle} ${invoice.invoiceNumber}`}
      author={settings.businessName || undefined}
    >
      <Page
        size="A4"
        style={{
          fontFamily: "NotoSansJP",
          fontSize: fs,
          padding: L.pageMargin,
          color: L.textColor,
        }}
      >
        {L.sections.map((k) => (
          <View key={k}>{sections[k]}</View>
        ))}
      </Page>
    </Document>
  );
}
