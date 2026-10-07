import ExcelJS from "exceljs";
import {
  calcInvoiceTotals,
  exclusiveUnitPrice,
  recipientLabel,
} from "@/lib/invoice";
import { formatDate } from "@/lib/dates";
import type { DocumentLayout } from "@/lib/documentFormat";
import type { DocInvoice, DocIssuer } from "./InvoiceDocument";
import type { DocOverrides } from "./overrides";

// 請求書をExcel（.xlsx）にする。PDFと同じ文言・書式の上書きを反映する。
// 見た目はPDFほど厳密には再現せず、表計算で扱いやすい形（明細の金額は数式）にする。

const YEN = "#,##0";

function argb(hex: string | undefined): string | undefined {
  return hex ? `FF${hex.replace("#", "").toUpperCase()}` : undefined;
}

export async function buildInvoiceXlsx(
  invoice: DocInvoice,
  issuer: DocIssuer,
  L: DocumentLayout,
  O: DocOverrides
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = issuer.businessName || "Fleet CRM";
  const ws = wb.addWorksheet(L.documentTitle.slice(0, 31) || "請求書", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ showGridLines: false }],
  });

  const cols = L.table.columns;
  const n = cols.length;
  const totalWidth = cols.reduce((s, c) => s + c.width, 0);
  ws.columns = cols.map((c) => ({ width: Math.max(8, Math.round((c.width / totalWidth) * 90)) }));
  const lastCol = ws.getColumn(n).letter;
  const half = Math.max(1, Math.ceil(n / 2));

  const fs = L.baseFontSize;
  const text = (k: string, def: string) => O.text[k] ?? def;
  /** セルに値と書式（上書き込み）を入れる */
  const put = (
    cell: ExcelJS.Cell,
    k: string,
    value: string | number | ExcelJS.CellFormulaValue,
    base: { size?: number; bold?: boolean; align?: "left" | "center" | "right"; color?: string } = {}
  ) => {
    const s = O.style[k] ?? {};
    cell.value = value;
    cell.font = {
      name: "Meiryo",
      size: s.fontSize ?? base.size ?? fs,
      bold: s.bold ?? base.bold ?? false,
      color: { argb: argb(s.color ?? base.color ?? L.textColor) },
    };
    cell.alignment = {
      horizontal: s.align ?? base.align ?? "left",
      vertical: "middle",
      wrapText: true,
    };
  };
  const merge = (row: number, from: number, to: number) => {
    if (to > from) ws.mergeCells(row, from, row, to);
  };
  const thin = { style: "thin" as const, color: { argb: argb(L.borderColor) } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };
  const fill = (hex: string): ExcelJS.Fill => ({
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: argb(hex) },
  });

  const { subtotal, taxAmount, adjustment, total } = calcInvoiceTotals(
    invoice.items,
    invoice.taxRate,
    invoice.taxMode,
    invoice.issueDate
  );
  const dueDateText = invoice.dueDate ? formatDate(invoice.dueDate) : "—";

  let r = 1;
  // タイトル
  put(ws.getCell(r, 1), "title", text("title", L.documentTitle), {
    size: L.titleFontSize,
    bold: true,
    align: L.titleAlign,
  });
  merge(r, 1, n);
  ws.getRow(r).height = L.titleFontSize * 1.8;
  r += 2;

  // 宛名（左）と 発行日・番号（右）
  const headerTop = r;
  put(ws.getCell(r, 1), "recipient", text("recipient", recipientLabel(invoice.client, invoice.honorific)), {
    size: L.recipientFontSize,
    bold: true,
  });
  merge(r, 1, half);
  ws.getCell(r, 1).border = { bottom: { style: "medium" } };
  let rr = headerTop;
  for (const m of L.metaFields) {
    const value =
      m.key === "issueDate"
        ? formatDate(invoice.issueDate)
        : m.key === "dueDate"
          ? dueDateText
          : invoice.invoiceNumber;
    put(ws.getCell(rr, half + 1), `meta.${m.key}.label`, text(`meta.${m.key}.label`, m.label), { bold: true });
    put(ws.getCell(rr, n), `meta.${m.key}.value`, value, { align: "right" });
    rr++;
  }
  r = Math.max(r + 1, rr);

  const greeting = text("greeting", L.greetingText);
  if (greeting) {
    put(ws.getCell(r, 1), "greeting", greeting);
    merge(r, 1, half);
    r++;
  }

  // 発行者（右）
  const issuerLines = [
    issuer.postalCode ? `〒${issuer.postalCode}` : null,
    issuer.address,
    issuer.phone ? `TEL：${issuer.phone}` : null,
    issuer.email,
    L.issuer.showRegistrationNumber && issuer.registrationNumber
      ? `${L.issuer.registrationLabel}：${issuer.registrationNumber}`
      : null,
  ].filter(Boolean).join("\n");
  put(ws.getCell(r, half + 1), "issuer.name", text("issuer.name", issuer.businessName), {
    size: fs + 4,
    bold: true,
  });
  merge(r, half + 1, n);
  r++;
  const linesText = text("issuer.lines", issuerLines);
  put(ws.getCell(r, half + 1), "issuer.lines", linesText);
  merge(r, half + 1, n);
  ws.getRow(r).height = Math.max(15, linesText.split("\n").length * (fs + 6));

  // ご請求金額（左）
  const totalRow = r;
  put(ws.getCell(totalRow, 1), "total.label", text("total.label", L.total.label), { bold: true, size: fs + 1 });
  const totalCell = ws.getCell(totalRow + 1, 1);
  put(totalCell, "total.value", total, { bold: true, size: fs + 6 });
  totalCell.numFmt = `"¥"#,##0"${text("total.suffix", L.total.suffix ? ` ${L.total.suffix}` : "").replace(/"/g, "")}"`;
  merge(totalRow + 1, 1, half);
  totalCell.border = { bottom: { style: "medium" } };
  r = totalRow + 3;

  // 支払期限・振込先
  put(ws.getCell(r, 1), "payment.dueLabel", text("payment.dueLabel", L.payment.dueDateLabel), { bold: true });
  put(ws.getCell(r, 2), "payment.dueValue", dueDateText);
  merge(r, 2, half);
  r++;
  const bank = text("payment.bank", (issuer.bankInfo ?? "").split("\n").filter(Boolean).join("\n"));
  put(ws.getCell(r, 1), "payment.bankLabel", text("payment.bankLabel", L.payment.bankLabel), { bold: true });
  put(ws.getCell(r, 2), "payment.bank", bank);
  merge(r, 2, n);
  ws.getRow(r).height = Math.max(15, bank.split("\n").length * (fs + 6));
  r++;
  if (L.payment.feeNote) {
    put(ws.getCell(r, 2), "payment.feeNote", text("payment.feeNote", L.payment.feeNote), { size: fs - 1 });
    merge(r, 2, n);
    r++;
  }
  r++;

  // 明細表（金額は 数量×単価 の数式）
  cols.forEach((c, i) => {
    const cell = ws.getCell(r, i + 1);
    put(cell, `items.header.${c.key}`, text(`items.header.${c.key}`, c.label), {
      bold: true,
      align: "center",
      color: L.table.headerStyle === "filled" ? L.accentTextColor : L.textColor,
    });
    cell.border = border;
    if (L.table.headerStyle === "filled") cell.fill = fill(L.accentColor);
  });
  r++;
  const colIndex = (key: string) => cols.findIndex((c) => c.key === key);
  const qtyCol = colIndex("quantity");
  invoice.items.forEach((item, idx) => {
    const excl = exclusiveUnitPrice(item.unitPrice, invoice.taxRate);
    cols.forEach((c, i) => {
      const cell = ws.getCell(r, i + 1);
      const k = `items.${c.key}.${item.id}`;
      const align = c.align;
      const priceCol = (key: string) => colIndex(key);
      let value: string | number | ExcelJS.CellFormulaValue;
      switch (c.key) {
        case "no":
          value = idx + 1;
          break;
        case "description":
          value = item.description;
          break;
        case "quantity":
          value = item.quantity;
          break;
        case "unitPriceExcl":
          value = excl;
          break;
        case "unitPriceIncl":
          value = item.unitPrice;
          break;
        case "amountExcl": {
          const p = priceCol("unitPriceExcl");
          value =
            qtyCol >= 0 && p >= 0
              ? { formula: `${ws.getCell(r, qtyCol + 1).address}*${ws.getCell(r, p + 1).address}`, result: item.quantity * excl }
              : item.quantity * excl;
          break;
        }
        case "amountIncl": {
          const p = priceCol("unitPriceIncl");
          value =
            qtyCol >= 0 && p >= 0
              ? { formula: `${ws.getCell(r, qtyCol + 1).address}*${ws.getCell(r, p + 1).address}`, result: item.quantity * item.unitPrice }
              : item.quantity * item.unitPrice;
          break;
        }
      }
      put(cell, k, value, { align });
      cell.border = border;
      if (c.key.startsWith("unitPrice") || c.key.startsWith("amount")) cell.numFmt = YEN;
      if (L.table.zebra && idx % 2 === 1) cell.fill = fill("#f3f4f6");
    });
    r++;
  });
  for (let i = invoice.items.length; i < L.table.minRows; i++) {
    cols.forEach((_, c) => (ws.getCell(r, c + 1).border = border));
    r++;
  }
  r++;

  // 合計欄（右寄せ）
  const adjusted = invoice.taxMode !== "STANDARD" && adjustment !== 0;
  for (const row of L.summary.rows) {
    if (row.key === "adjustment" && !adjusted) continue;
    const label = text(
      `summary.${row.key}.label`,
      row.key === "tax" && invoice.taxMode !== "STANDARD" ? "消費税相当額" : row.label
    );
    const value =
      row.key === "subtotal" ? subtotal : row.key === "tax" ? taxAmount : row.key === "adjustment" ? adjustment : total;
    const labelCell = ws.getCell(r, Math.max(1, n - 1));
    const valueCell = ws.getCell(r, n);
    put(labelCell, `summary.${row.key}.label`, label, {
      bold: true,
      align: "center",
      color: L.summary.style === "filled-label" ? L.accentTextColor : L.textColor,
    });
    if (L.summary.style === "filled-label") labelCell.fill = fill(L.accentColor);
    put(valueCell, `summary.${row.key}.value`, value, { align: "right", bold: row.key === "total" });
    valueCell.numFmt = YEN;
    labelCell.border = border;
    valueCell.border = border;
    r++;
  }
  r++;

  // 備考
  put(ws.getCell(r, 1), "notes.label", text("notes.label", L.notes.label), { bold: true });
  r++;
  const notes = invoice.notes ?? "";
  put(ws.getCell(r, 1), "notes.body", notes);
  ws.mergeCells(`A${r}:${lastCol}${r}`);
  ws.getRow(r).height = Math.max(40, notes.split("\n").length * (fs + 6));

  return Buffer.from(await wb.xlsx.writeBuffer());
}
