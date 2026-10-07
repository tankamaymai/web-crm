import type { ReactNode } from "react";
import type { Style } from "@react-pdf/types";
import {
  calcInvoiceTotals,
  exclusiveUnitPrice,
  recipientLabel,
  transitionalDeductionRate,
} from "@/lib/invoice";
import { formatDate } from "@/lib/dates";
import type { ColumnKey, DocumentLayout } from "@/lib/documentFormat";
import type { CellStyle, DocOverrides } from "./overrides";

// 請求書1枚分の中身。PDF（react-pdf）と編集画面（HTML）の両方で同じものを描く。
// 箱（Box）と文字（Txt）の描き方、文字の欄（renderField）を差し替えて使う。
// 単位は pt（A4 = 595 × 842）。

export type DocInvoice = {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date | null;
  taxRate: number;
  taxMode: string;
  honorific: string;
  notes: string | null;
  client: { name: string; company: string | null };
  items: { id: string; description: string; quantity: number; unitPrice: number }[];
};

export type DocIssuer = {
  businessName: string;
  postalCode: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  registrationNumber: string | null;
  bankInfo: string | null;
};

/** 欄の種類。text 以外は請求書のデータそのものを書き換える */
export type FieldEdit =
  | "text"
  | "description"
  | "quantity"
  | "unitPriceExcl"
  | "unitPriceIncl"
  | "notes"
  | "issueDate"
  | "dueDate"
  | "none";

export type FieldSpec = {
  /** 書式・文言の保存に使うキー */
  k: string;
  value: string;
  /** 書き換え前の文言（text の欄だけ。元に戻すときに使う） */
  defaultValue?: string;
  style: Style;
  /** 書式を上書きする前のスタイル（ツールバーの表示・リセット用） */
  baseStyle: Style;
  edit: FieldEdit;
  multiline?: boolean;
  itemId?: string;
};

export type Prims = {
  Box: (props: { style?: Style; children?: ReactNode; wrap?: boolean }) => ReactNode;
};

export const PAGE_WIDTH = 595;
export const PAGE_HEIGHT = 842;

function yen(n: number): string {
  return n.toLocaleString("ja-JP");
}

/** 上書きされた書式を、もとのスタイルに重ねる */
export function applyCellStyle(base: Style, s: CellStyle | undefined): Style {
  if (!s) return base;
  return {
    ...base,
    ...(s.fontSize !== undefined ? { fontSize: s.fontSize } : {}),
    ...(s.bold !== undefined ? { fontWeight: s.bold ? "bold" : "normal" } : {}),
    ...(s.color ? { color: s.color } : {}),
    ...(s.align ? { textAlign: s.align } : {}),
  };
}

export function pageStyle(L: DocumentLayout): Style {
  return {
    fontFamily: "NotoSansJP",
    fontSize: L.baseFontSize,
    padding: L.pageMargin,
    color: L.textColor,
  };
}

export default function InvoiceDocument({
  invoice,
  issuer,
  layout: L,
  overrides: O,
  Box,
  renderField,
  minRowsExtra,
}: {
  invoice: DocInvoice;
  issuer: DocIssuer;
  layout: DocumentLayout;
  overrides: DocOverrides;
  Box: Prims["Box"];
  renderField: (spec: FieldSpec) => ReactNode;
  /** 編集画面では空行の数を変えない（行の追加は明細を増やして行う） */
  minRowsExtra?: number;
}) {
  const { subtotal, taxAmount, adjustment, total } = calcInvoiceTotals(
    invoice.items,
    invoice.taxRate,
    invoice.taxMode,
    invoice.issueDate
  );
  const adjusted = invoice.taxMode !== "STANDARD" && adjustment !== 0;
  const fs = L.baseFontSize;
  const line = { borderColor: L.borderColor, borderWidth: 0.8 };
  const filled: Style = {
    backgroundColor: L.accentColor,
    color: L.accentTextColor,
    fontWeight: "bold",
  };

  /** 欄を1つ描く。文言の差し替えと書式の上書きをここで反映する */
  const F = (
    k: string,
    value: string,
    style: Style = {},
    edit: FieldEdit = "text",
    extra: Partial<FieldSpec> = {}
  ) =>
    renderField({
      k,
      value: edit === "text" ? (O.text[k] ?? value) : value,
      defaultValue: edit === "text" ? value : undefined,
      style: applyCellStyle({ fontSize: fs, ...style }, O.style[k]),
      baseStyle: { fontSize: fs, ...style },
      edit,
      ...extra,
    });

  // ---------- 各パーツ ----------

  const title = (
    <Box
      style={{
        marginBottom: 16,
        ...(L.titleStyle === "band"
          ? { ...filled, paddingVertical: 6 }
          : L.titleStyle === "boxed"
            ? { ...line, paddingVertical: 6 }
            : {}),
      }}
    >
      {F("title", L.documentTitle, {
        fontSize: L.titleFontSize,
        fontWeight: "bold",
        letterSpacing: L.titleLetterSpacing,
        textAlign: L.titleAlign,
        color: L.titleStyle === "band" ? L.accentTextColor : L.textColor,
        ...(L.titleStyle === "underline"
          ? { textDecoration: "underline" }
          : {}),
      })}
    </Box>
  );

  const recipient = (
    <Box
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
      {F("recipient", recipientLabel(invoice.client, invoice.honorific), {
        fontSize: L.recipientFontSize,
        fontWeight: "bold",
      })}
    </Box>
  );

  const greeting =
    (O.text.greeting ?? L.greetingText) ? (
      <Box style={{ marginBottom: 10 }}>{F("greeting", L.greetingText)}</Box>
    ) : null;

  const totalBox = (
    <Box
      style={{
        flexDirection: "row",
        alignItems: "stretch",
        marginBottom: 12,
        ...(L.total.style === "boxed" ? line : {}),
      }}
    >
      <Box
        style={{
          justifyContent: "center",
          paddingHorizontal: 10,
          ...(L.total.style === "band" ? filled : {}),
        }}
      >
        {F("total.label", L.total.label, {
          fontSize: fs + 1,
          fontWeight: "bold",
          textAlign: "center",
          color: L.total.style === "band" ? L.accentTextColor : L.textColor,
        })}
      </Box>
      <Box
        style={{
          flex: 1,
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "flex-end",
          paddingVertical: 5,
          ...(L.total.style === "band" || L.total.style === "underline"
            ? { borderBottomWidth: 1.2, borderBottomColor: L.textColor }
            : {}),
        }}
      >
        {F("total.value", `¥${yen(total)}`, {
          fontSize: fs + 6,
          fontWeight: "bold",
        }, "none")}
        {F("total.suffix", L.total.suffix ? ` ${L.total.suffix}` : "", {
          fontSize: fs + 6,
          fontWeight: "bold",
        })}
      </Box>
    </Box>
  );

  const dueDateText = invoice.dueDate ? formatDate(invoice.dueDate) : "—";
  const bankText = (issuer.bankInfo ?? "").split("\n").filter(Boolean).join("\n");
  const bankBody = (
    <Box>
      {F("payment.bank", bankText, {}, "text", { multiline: true })}
      {L.payment.feeNote
        ? F("payment.feeNote", L.payment.feeNote, { fontSize: fs - 1.5, marginTop: 3 })
        : null}
    </Box>
  );
  const payLabel = (k: string, text: string) => (
    <Box style={{ ...filled, width: 62, justifyContent: "center", paddingVertical: 4 }}>
      {F(k, text, { textAlign: "center", fontWeight: "bold", color: L.accentTextColor })}
    </Box>
  );
  const payment =
    L.payment.style === "labeled-table" ? (
      <Box style={{ ...line, marginBottom: 12 }}>
        <Box
          style={{
            flexDirection: "row",
            borderBottomWidth: 0.8,
            borderBottomColor: L.borderColor,
          }}
        >
          {payLabel("payment.dueLabel", L.payment.dueDateLabel)}
          <Box style={{ flex: 1, paddingVertical: 4, paddingHorizontal: 6 }}>
            {F("payment.dueValue", dueDateText, {}, "dueDate")}
          </Box>
        </Box>
        <Box style={{ flexDirection: "row" }}>
          {payLabel("payment.bankLabel", L.payment.bankLabel)}
          <Box style={{ flex: 1, paddingVertical: 4, paddingHorizontal: 6 }}>
            {bankBody}
          </Box>
        </Box>
      </Box>
    ) : (
      <Box style={{ marginBottom: 12 }}>
        <Box style={{ flexDirection: "row", marginBottom: 3 }}>
          {F("payment.dueLabel", `${L.payment.dueDateLabel}：`, { fontWeight: "bold" })}
          {F("payment.dueValue", dueDateText, {}, "dueDate")}
        </Box>
        {F("payment.bankLabel", `${L.payment.bankLabel}：`, { fontWeight: "bold" })}
        {bankBody}
      </Box>
    );

  const meta = (
    <Box style={{ marginBottom: 10 }}>
      {L.metaFields.map((m) => (
        <Box key={m.key} style={{ flexDirection: "row", marginBottom: 2 }}>
          <Box style={{ width: 64 }}>
            {F(`meta.${m.key}.label`, m.label, { fontWeight: "bold" })}
          </Box>
          <Box style={{ flex: 1 }}>
            {m.key === "issueDate"
              ? F("meta.issueDate.value", formatDate(invoice.issueDate), { textAlign: "right" }, "issueDate")
              : m.key === "dueDate"
                ? F("meta.dueDate.value", dueDateText, { textAlign: "right" }, "dueDate")
                : F("meta.invoiceNumber.value", invoice.invoiceNumber, { textAlign: "right" }, "none")}
          </Box>
        </Box>
      ))}
    </Box>
  );

  const issuerLines = [
    issuer.postalCode ? `〒${issuer.postalCode}` : null,
    issuer.address,
    issuer.phone ? `TEL：${issuer.phone}` : null,
    issuer.email,
    L.issuer.showRegistrationNumber && issuer.registrationNumber
      ? `${L.issuer.registrationLabel}：${issuer.registrationNumber}`
      : null,
  ].filter((l): l is string => Boolean(l));
  const issuerBlock = (
    <Box style={{ marginBottom: 8 }}>
      {F("issuer.name", issuer.businessName, {
        fontSize: fs + 4,
        fontWeight: "bold",
        marginBottom: 5,
        textAlign: L.issuer.align,
      })}
      {F("issuer.lines", issuerLines.join("\n"), {
        lineHeight: 1.5,
        textAlign: L.issuer.align,
      }, "text", { multiline: true })}
    </Box>
  );

  const seal = (
    <Box
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
      {F("seal", "印", { color: L.borderColor, fontSize: fs - 1, textAlign: "center" })}
    </Box>
  );

  const parts: Record<string, ReactNode> = {
    recipient,
    greeting,
    total: totalBox,
    payment,
    meta,
    issuer: issuerBlock,
    seal,
  };

  const header = (
    <Box
      style={{
        flexDirection: L.header.recipientSide === "left" ? "row" : "row-reverse",
        justifyContent: "space-between",
        marginBottom: 12,
      }}
    >
      <Box style={{ width: "56%" }}>
        {L.header.recipientColumn.map((k) => (
          <Box key={k}>{parts[k]}</Box>
        ))}
      </Box>
      <Box style={{ width: "38%" }}>
        {L.header.issuerColumn.map((k) => (
          <Box key={k}>{parts[k]}</Box>
        ))}
      </Box>
    </Box>
  );

  // ---------- 明細表 ----------

  const cols = L.table.columns;
  const cellBox = (i: number): Style => ({
    flex: cols[i].width,
    paddingVertical: 4,
    paddingHorizontal: 5,
    justifyContent: "center",
    ...(i < cols.length - 1
      ? { borderRightWidth: 0.8, borderRightColor: L.borderColor }
      : {}),
  });
  const headerRowStyle: Style =
    L.table.headerStyle === "filled"
      ? { backgroundColor: L.accentColor }
      : L.table.headerStyle === "underline"
        ? { borderBottomWidth: 1.2, borderBottomColor: L.textColor }
        : {};
  const headerTextColor =
    L.table.headerStyle === "filled" ? L.accentTextColor : L.textColor;

  const itemCell = (
    key: ColumnKey,
    item: DocInvoice["items"][number],
    index: number,
    colIndex: number
  ) => {
    const excl = exclusiveUnitPrice(item.unitPrice, invoice.taxRate);
    const base: Style = { textAlign: cols[colIndex].align };
    const k = `items.${key}.${item.id}`;
    switch (key) {
      case "no":
        return F(k, String(index + 1), base, "none");
      case "description":
        return F(k, item.description, base, "description", { itemId: item.id });
      case "quantity":
        return F(k, String(item.quantity), base, "quantity", { itemId: item.id });
      case "unitPriceExcl":
        return F(k, yen(excl), base, "unitPriceExcl", { itemId: item.id });
      case "unitPriceIncl":
        return F(k, yen(item.unitPrice), base, "unitPriceIncl", { itemId: item.id });
      case "amountExcl":
        return F(k, yen(item.quantity * excl), base, "none");
      case "amountIncl":
        return F(k, yen(item.quantity * item.unitPrice), base, "none");
    }
  };

  const filler = Math.max(0, L.table.minRows + (minRowsExtra ?? 0) - invoice.items.length);
  const items = (
    <Box style={{ ...line, marginBottom: 10 }}>
      <Box style={{ flexDirection: "row", ...headerRowStyle }}>
        {cols.map((c, i) => (
          <Box key={c.key} style={cellBox(i)}>
            {F(`items.header.${c.key}`, c.label, {
              textAlign: "center",
              fontWeight: "bold",
              color: headerTextColor,
            })}
          </Box>
        ))}
      </Box>
      {invoice.items.map((item, r) => (
        <Box
          key={item.id}
          wrap={false}
          style={{
            flexDirection: "row",
            borderTopWidth: 0.8,
            borderTopColor: L.borderColor,
            ...(L.table.zebra && r % 2 === 1 ? { backgroundColor: "#f3f4f6" } : {}),
          }}
        >
          {cols.map((c, i) => (
            <Box key={c.key} style={cellBox(i)}>
              {itemCell(c.key, item, r, i)}
            </Box>
          ))}
        </Box>
      ))}
      {Array.from({ length: filler }, (_, r) => (
        <Box
          key={`filler-${r}`}
          wrap={false}
          style={{
            flexDirection: "row",
            borderTopWidth: 0.8,
            borderTopColor: L.borderColor,
            ...(L.table.zebra && (invoice.items.length + r) % 2 === 1
              ? { backgroundColor: "#f3f4f6" }
              : {}),
          }}
        >
          {cols.map((c, i) => (
            <Box key={c.key} style={{ ...cellBox(i), minHeight: fs * 1.4 + 8 }} />
          ))}
        </Box>
      ))}
    </Box>
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
  const summaryRows = L.summary.rows.filter((r) => r.key !== "adjustment" || adjusted);
  const sums = (
    <Box style={{ width: 210, ...(L.summary.style === "boxed" ? line : {}) }}>
      {summaryRows.map((r) => (
        <Box
          key={r.key}
          style={{
            flexDirection: "row",
            ...(L.summary.style === "filled-label"
              ? { ...line, marginBottom: -0.8 }
              : { borderBottomWidth: 0.8, borderBottomColor: L.borderColor }),
          }}
        >
          <Box
            style={{
              width: 92,
              paddingVertical: 4,
              justifyContent: "center",
              ...(L.summary.style === "filled-label" ? { backgroundColor: L.accentColor } : {}),
            }}
          >
            {F(
              `summary.${r.key}.label`,
              r.key === "tax" && invoice.taxMode !== "STANDARD" ? "消費税相当額" : r.label,
              {
                textAlign: "center",
                fontWeight: "bold",
                color: L.summary.style === "filled-label" ? L.accentTextColor : L.textColor,
              }
            )}
          </Box>
          <Box style={{ flex: 1, paddingVertical: 4, paddingHorizontal: 6 }}>
            {F(`summary.${r.key}.value`, summaryValue(r.key), {
              textAlign: "right",
              fontWeight: r.key === "total" ? "bold" : "normal",
            }, "none")}
          </Box>
        </Box>
      ))}
    </Box>
  );
  const tbCell: Style = { flex: 1, padding: 3 };
  const taxBreakdown = (
    <Box style={{ width: 250, ...line }}>
      <Box style={{ flexDirection: "row", backgroundColor: "#e5e5e5" }}>
        <Box style={{ ...tbCell, flex: undefined, width: 80 }}>
          {F("taxbreak.h0", "税率別内訳", { textAlign: "center", fontWeight: "bold" })}
        </Box>
        <Box style={tbCell}>
          {F("taxbreak.h1", "税抜金額", { textAlign: "center", fontWeight: "bold" })}
        </Box>
        <Box style={tbCell}>
          {F("taxbreak.h2", "消費税額", { textAlign: "center", fontWeight: "bold" })}
        </Box>
      </Box>
      <Box style={{ flexDirection: "row", borderTopWidth: 0.8, borderTopColor: L.borderColor }}>
        <Box style={{ ...tbCell, flex: undefined, width: 80 }}>
          {F("taxbreak.rate", `${invoice.taxRate}%対象`, { textAlign: "right" }, "none")}
        </Box>
        <Box style={tbCell}>
          {F("taxbreak.subtotal", yen(subtotal), { textAlign: "right" }, "none")}
        </Box>
        <Box style={tbCell}>
          {F("taxbreak.tax", yen(taxAmount), { textAlign: "right" }, "none")}
        </Box>
      </Box>
    </Box>
  );
  const summary = (
    <Box
      wrap={false}
      style={{
        flexDirection: L.summary.align === "right" ? "row" : "row-reverse",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 14,
      }}
    >
      {L.summary.showTaxBreakdown ? taxBreakdown : <Box />}
      {sums}
    </Box>
  );

  // ---------- 備考 ----------

  const deductionPercent = Math.round(transitionalDeductionRate(invoice.issueDate) * 100);
  const notesBody = (
    <Box>
      {F("notes.body", invoice.notes ?? "", { lineHeight: 1.5 }, "notes", { multiline: true })}
      {adjusted &&
        F(
          "notes.adjust",
          `※ 当方はインボイス（適格請求書発行事業者）未登録のため、仕入税額控除の対象とならない消費税相当分を調整値引きしています（経過措置による控除割合${deductionPercent}%）。`,
          { fontSize: fs - 1.5, marginTop: 4 }
        )}
    </Box>
  );
  const notesLabelStyle: Style = { fontWeight: "bold", marginBottom: 4 };
  const notes =
    L.notes.style === "header-band" ? (
      <Box wrap={false}>
        <Box style={{ ...filled, paddingVertical: 4 }}>
          {F("notes.label", L.notes.label, {
            textAlign: "center",
            fontWeight: "bold",
            color: L.accentTextColor,
          })}
        </Box>
        <Box style={{ ...line, borderTopWidth: 0, minHeight: 60, padding: 8 }}>
          {notesBody}
        </Box>
      </Box>
    ) : L.notes.style === "boxed" ? (
      <Box wrap={false} style={{ ...line, minHeight: 60, padding: 8 }}>
        {F("notes.label", L.notes.label, notesLabelStyle)}
        {notesBody}
      </Box>
    ) : (
      <Box wrap={false}>
        {F("notes.label", L.notes.label, notesLabelStyle)}
        {notesBody}
      </Box>
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
    <>
      {L.sections.map((k) => (
        <Box key={k}>{sections[k]}</Box>
      ))}
    </>
  );
}
