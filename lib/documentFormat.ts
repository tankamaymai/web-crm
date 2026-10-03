// 書類の「書式（見た目）」の定義。
// アップロードされたPDFをAIが読み取ってこの形に落とし込み、
// lib/pdf/FormattedInvoicePdf.tsx が請求書データを流し込んで描画する。

export const SECTION_KEYS = [
  "title",
  "header",
  "greeting",
  "total",
  "payment",
  "items",
  "summary",
  "notes",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const RECIPIENT_COLUMN_KEYS = [
  "recipient",
  "greeting",
  "total",
  "payment",
] as const;
export const ISSUER_COLUMN_KEYS = ["meta", "issuer", "seal"] as const;

export const META_KEYS = ["issueDate", "invoiceNumber", "dueDate"] as const;

export const COLUMN_KEYS = [
  "no",
  "description",
  "quantity",
  "unitPriceExcl",
  "unitPriceIncl",
  "amountExcl",
  "amountIncl",
] as const;
export type ColumnKey = (typeof COLUMN_KEYS)[number];

export const SUMMARY_KEYS = ["subtotal", "tax", "adjustment", "total"] as const;

type Align = "left" | "center" | "right";

export type DocumentLayout = {
  documentTitle: string;
  titleAlign: Align;
  titleStyle: "plain" | "underline" | "band" | "boxed";
  titleFontSize: number;
  titleLetterSpacing: number;
  accentColor: string;
  accentTextColor: string;
  borderColor: string;
  textColor: string;
  baseFontSize: number;
  pageMargin: number;
  sections: SectionKey[];
  header: {
    recipientSide: "left" | "right";
    recipientColumn: (typeof RECIPIENT_COLUMN_KEYS)[number][];
    issuerColumn: (typeof ISSUER_COLUMN_KEYS)[number][];
  };
  recipientStyle: "underline" | "plain" | "boxed";
  recipientFontSize: number;
  metaFields: { key: (typeof META_KEYS)[number]; label: string }[];
  greetingText: string;
  total: {
    label: string;
    style: "band" | "underline" | "boxed" | "plain";
    suffix: string;
  };
  payment: {
    dueDateLabel: string;
    bankLabel: string;
    style: "labeled-table" | "plain";
    feeNote: string;
  };
  issuer: {
    align: Align;
    showRegistrationNumber: boolean;
    registrationLabel: string;
  };
  table: {
    columns: { key: ColumnKey; label: string; width: number; align: Align }[];
    headerStyle: "filled" | "outlined" | "underline";
    minRows: number;
    zebra: boolean;
  };
  summary: {
    align: "left" | "right";
    style: "filled-label" | "plain" | "boxed";
    rows: { key: (typeof SUMMARY_KEYS)[number]; label: string }[];
    showTaxBreakdown: boolean;
  };
  notes: {
    label: string;
    style: "boxed" | "plain" | "header-band";
  };
};

/** アプリ標準の請求書に近い書式（読み取り結果の補完にも使う） */
export const STANDARD_LAYOUT: DocumentLayout = {
  documentTitle: "御請求書",
  titleAlign: "center",
  titleStyle: "plain",
  titleFontSize: 18,
  titleLetterSpacing: 10,
  accentColor: "#3f3f3f",
  accentTextColor: "#ffffff",
  borderColor: "#8a8a8a",
  textColor: "#111111",
  baseFontSize: 9,
  pageMargin: 44,
  sections: ["title", "header", "items", "summary", "notes"],
  header: {
    recipientSide: "left",
    recipientColumn: ["recipient", "greeting", "payment", "total"],
    issuerColumn: ["meta", "issuer"],
  },
  recipientStyle: "underline",
  recipientFontSize: 14,
  metaFields: [
    { key: "issueDate", label: "発行日" },
    { key: "invoiceNumber", label: "請求No." },
  ],
  greetingText: "下記のとおり、御請求申し上げます。",
  total: { label: "合計", style: "band", suffix: "円 (税込)" },
  payment: {
    dueDateLabel: "支払期限",
    bankLabel: "振込先",
    style: "labeled-table",
    feeNote: "※ 振込手数料は貴社ご負担にてお願い申し上げます。",
  },
  issuer: {
    align: "left",
    showRegistrationNumber: true,
    registrationLabel: "登録番号",
  },
  table: {
    columns: [
      { key: "description", label: "摘要", width: 5, align: "left" },
      { key: "quantity", label: "数量", width: 1, align: "center" },
      { key: "unitPriceExcl", label: "単価(税抜)", width: 1.6, align: "right" },
      { key: "amountIncl", label: "金額(税込)", width: 1.8, align: "right" },
    ],
    headerStyle: "filled",
    minRows: 10,
    zebra: false,
  },
  summary: {
    align: "right",
    style: "filled-label",
    rows: [
      { key: "subtotal", label: "小計(税抜)" },
      { key: "tax", label: "消費税" },
      { key: "adjustment", label: "調整値引き" },
      { key: "total", label: "合計" },
    ],
    showTaxBreakdown: true,
  },
  notes: { label: "備考", style: "header-band" },
};

// ---------- AIに渡すJSONスキーマ（構造化出力用） ----------

const str = { type: "string" } as const;
const num = { type: "number" } as const;
const bool = { type: "boolean" } as const;
const enumOf = (values: readonly string[]) => ({
  type: "string",
  enum: [...values],
});
const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const align = enumOf(["left", "center", "right"]);

export const DOCUMENT_LAYOUT_JSON_SCHEMA = obj({
  documentTitle: str,
  titleAlign: align,
  titleStyle: enumOf(["plain", "underline", "band", "boxed"]),
  titleFontSize: num,
  titleLetterSpacing: num,
  accentColor: str,
  accentTextColor: str,
  borderColor: str,
  textColor: str,
  baseFontSize: num,
  pageMargin: num,
  sections: { type: "array", items: enumOf(SECTION_KEYS) },
  header: obj({
    recipientSide: enumOf(["left", "right"]),
    recipientColumn: { type: "array", items: enumOf(RECIPIENT_COLUMN_KEYS) },
    issuerColumn: { type: "array", items: enumOf(ISSUER_COLUMN_KEYS) },
  }),
  recipientStyle: enumOf(["underline", "plain", "boxed"]),
  recipientFontSize: num,
  metaFields: {
    type: "array",
    items: obj({ key: enumOf(META_KEYS), label: str }),
  },
  greetingText: str,
  total: obj({
    label: str,
    style: enumOf(["band", "underline", "boxed", "plain"]),
    suffix: str,
  }),
  payment: obj({
    dueDateLabel: str,
    bankLabel: str,
    style: enumOf(["labeled-table", "plain"]),
    feeNote: str,
  }),
  issuer: obj({
    align,
    showRegistrationNumber: bool,
    registrationLabel: str,
  }),
  table: obj({
    columns: {
      type: "array",
      items: obj({ key: enumOf(COLUMN_KEYS), label: str, width: num, align }),
    },
    headerStyle: enumOf(["filled", "outlined", "underline"]),
    minRows: { type: "integer" },
    zebra: bool,
  }),
  summary: obj({
    align: enumOf(["left", "right"]),
    style: enumOf(["filled-label", "plain", "boxed"]),
    rows: {
      type: "array",
      items: obj({ key: enumOf(SUMMARY_KEYS), label: str }),
    },
    showTaxBreakdown: bool,
  }),
  notes: obj({
    label: str,
    style: enumOf(["boxed", "plain", "header-band"]),
  }),
});

// ---------- 検証・補正 ----------
// 構造化出力でも数値の範囲までは保証されないため、ここで丸めて安全な値にする。
// DBから読んだ値（古い形式・手修正）もこの関数を通してから使う。

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function pickStr(v: unknown, fallback: string, max = 60): string {
  return typeof v === "string" ? v.slice(0, max) : fallback;
}
function pickNum(v: unknown, fallback: number, min: number, max: number) {
  return typeof v === "number" && Number.isFinite(v)
    ? Math.min(max, Math.max(min, v))
    : fallback;
}
function pickBool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}
function pickEnum<T extends string>(
  v: unknown,
  values: readonly T[],
  fallback: T
): T {
  return values.includes(v as T) ? (v as T) : fallback;
}
function pickColor(v: unknown, fallback: string): string {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
}
function pickEnumList<T extends string>(
  v: unknown,
  values: readonly T[],
  fallback: T[]
): T[] {
  if (!Array.isArray(v)) return fallback;
  const list = v.filter((x): x is T => values.includes(x as T));
  return [...new Set(list)];
}

const ALIGNS = ["left", "center", "right"] as const;

export function normalizeLayout(input: unknown): DocumentLayout {
  const S = STANDARD_LAYOUT;
  const v = isRecord(input) ? input : {};
  const header = isRecord(v.header) ? v.header : {};
  const total = isRecord(v.total) ? v.total : {};
  const payment = isRecord(v.payment) ? v.payment : {};
  const issuer = isRecord(v.issuer) ? v.issuer : {};
  const table = isRecord(v.table) ? v.table : {};
  const summary = isRecord(v.summary) ? v.summary : {};
  const notes = isRecord(v.notes) ? v.notes : {};

  const recipientColumn = pickEnumList(
    header.recipientColumn,
    RECIPIENT_COLUMN_KEYS,
    S.header.recipientColumn
  );
  if (!recipientColumn.includes("recipient")) recipientColumn.unshift("recipient");

  let sections = pickEnumList(v.sections, SECTION_KEYS, S.sections);
  // 宛名と明細は請求書として欠かせないので必ず入れる
  if (!sections.includes("header")) sections.unshift("header");
  if (!sections.includes("items")) sections.push("items");
  // 合計金額がどこにも無い書式は、ヘッダーの直後に入れておく
  if (!recipientColumn.includes("total") && !sections.includes("total")) {
    sections.splice(sections.indexOf("header") + 1, 0, "total");
  }
  // ヘッダー内に置いたものは本文側から外す（二重表示を防ぐ）
  sections = sections.filter(
    (s) => !(recipientColumn as string[]).includes(s)
  );

  const metaFields = Array.isArray(v.metaFields)
    ? v.metaFields
        .filter(isRecord)
        .filter((m) => META_KEYS.includes(m.key as never))
        .map((m) => ({
          key: m.key as (typeof META_KEYS)[number],
          label: pickStr(m.label, ""),
        }))
    : S.metaFields;

  let columns = Array.isArray(table.columns)
    ? table.columns
        .filter(isRecord)
        .filter((c) => COLUMN_KEYS.includes(c.key as ColumnKey))
        .map((c) => ({
          key: c.key as ColumnKey,
          label: pickStr(c.label, ""),
          width: pickNum(c.width, 1, 0.3, 20),
          align: pickEnum(c.align, ALIGNS, "left"),
        }))
    : S.table.columns;
  if (!columns.some((c) => c.key === "description")) {
    columns = [S.table.columns[0], ...columns];
  }
  if (!columns.some((c) => c.key.startsWith("amount"))) {
    columns = [...columns, S.table.columns[3]];
  }

  const summaryRows = Array.isArray(summary.rows)
    ? summary.rows
        .filter(isRecord)
        .filter((r) => SUMMARY_KEYS.includes(r.key as never))
        .map((r) => ({
          key: r.key as (typeof SUMMARY_KEYS)[number],
          label: pickStr(r.label, ""),
        }))
    : S.summary.rows;

  return {
    documentTitle: pickStr(v.documentTitle, S.documentTitle, 20) || S.documentTitle,
    titleAlign: pickEnum(v.titleAlign, ALIGNS, S.titleAlign),
    titleStyle: pickEnum(
      v.titleStyle,
      ["plain", "underline", "band", "boxed"] as const,
      S.titleStyle
    ),
    titleFontSize: pickNum(v.titleFontSize, S.titleFontSize, 10, 32),
    titleLetterSpacing: pickNum(v.titleLetterSpacing, S.titleLetterSpacing, 0, 24),
    accentColor: pickColor(v.accentColor, S.accentColor),
    accentTextColor: pickColor(v.accentTextColor, S.accentTextColor),
    borderColor: pickColor(v.borderColor, S.borderColor),
    textColor: pickColor(v.textColor, S.textColor),
    baseFontSize: pickNum(v.baseFontSize, S.baseFontSize, 7, 12),
    pageMargin: pickNum(v.pageMargin, S.pageMargin, 20, 80),
    sections,
    header: {
      recipientSide: pickEnum(
        header.recipientSide,
        ["left", "right"] as const,
        S.header.recipientSide
      ),
      recipientColumn,
      issuerColumn: pickEnumList(
        header.issuerColumn,
        ISSUER_COLUMN_KEYS,
        S.header.issuerColumn
      ),
    },
    recipientStyle: pickEnum(
      v.recipientStyle,
      ["underline", "plain", "boxed"] as const,
      S.recipientStyle
    ),
    recipientFontSize: pickNum(v.recipientFontSize, S.recipientFontSize, 9, 24),
    metaFields,
    greetingText: pickStr(v.greetingText, S.greetingText, 120),
    total: {
      label: pickStr(total.label, S.total.label, 20),
      style: pickEnum(
        total.style,
        ["band", "underline", "boxed", "plain"] as const,
        S.total.style
      ),
      suffix: pickStr(total.suffix, S.total.suffix, 20),
    },
    payment: {
      dueDateLabel: pickStr(payment.dueDateLabel, S.payment.dueDateLabel, 20),
      bankLabel: pickStr(payment.bankLabel, S.payment.bankLabel, 20),
      style: pickEnum(
        payment.style,
        ["labeled-table", "plain"] as const,
        S.payment.style
      ),
      feeNote: pickStr(payment.feeNote, S.payment.feeNote, 120),
    },
    issuer: {
      align: pickEnum(issuer.align, ALIGNS, S.issuer.align),
      showRegistrationNumber: pickBool(
        issuer.showRegistrationNumber,
        S.issuer.showRegistrationNumber
      ),
      registrationLabel: pickStr(
        issuer.registrationLabel,
        S.issuer.registrationLabel,
        20
      ),
    },
    table: {
      columns,
      headerStyle: pickEnum(
        table.headerStyle,
        ["filled", "outlined", "underline"] as const,
        S.table.headerStyle
      ),
      minRows: Math.round(pickNum(table.minRows, S.table.minRows, 0, 20)),
      zebra: pickBool(table.zebra, S.table.zebra),
    },
    summary: {
      align: pickEnum(summary.align, ["left", "right"] as const, S.summary.align),
      style: pickEnum(
        summary.style,
        ["filled-label", "plain", "boxed"] as const,
        S.summary.style
      ),
      rows: summaryRows,
      showTaxBreakdown: pickBool(
        summary.showTaxBreakdown,
        S.summary.showTaxBreakdown
      ),
    },
    notes: {
      label: pickStr(notes.label, S.notes.label, 20),
      style: pickEnum(
        notes.style,
        ["boxed", "plain", "header-band"] as const,
        S.notes.style
      ),
    },
  };
}
