"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { Style } from "@react-pdf/types";
import InvoiceDocument, {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  pageStyle,
  type DocInvoice,
  type DocIssuer,
  type FieldSpec,
} from "@/lib/invoiceDoc/InvoiceDocument";
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  type CellStyle,
  type DocOverrides,
} from "@/lib/invoiceDoc/overrides";
import type { DocumentLayout } from "@/lib/documentFormat";
import {
  addBlankInvoiceItem,
  deleteInvoiceItem,
  saveInvoiceDocOverrides,
  updateInvoiceDocFields,
  updateInvoiceItemFields,
} from "@/app/actions/invoices";

// 請求書を、PDFと同じ見た目のまま直接書き換えられるエディタ。
// クリックした欄をその場で編集し、ツールバーで文字の大きさ・太字・色・揃えを変える（Excelのセルの感覚）。

type Item = DocInvoice["items"][number];

const COLORS = ["#111111", "#6b7280", "#1d4ed8", "#0f766e", "#b91c1c", "#c2410c"];

// react-pdf のスタイルを HTML の CSS に直す（react-pdf 独自の省略記法を展開する）
function toCss(style: Style | undefined): CSSProperties {
  if (!style) return {};
  const {
    paddingVertical,
    paddingHorizontal,
    marginVertical,
    marginHorizontal,
    ...rest
  } = style as Style & Record<string, unknown>;
  const css = { ...rest } as Record<string, unknown>;
  if (paddingVertical !== undefined) {
    css.paddingTop ??= paddingVertical;
    css.paddingBottom ??= paddingVertical;
  }
  if (paddingHorizontal !== undefined) {
    css.paddingLeft ??= paddingHorizontal;
    css.paddingRight ??= paddingHorizontal;
  }
  if (marginVertical !== undefined) {
    css.marginTop ??= marginVertical;
    css.marginBottom ??= marginVertical;
  }
  if (marginHorizontal !== undefined) {
    css.marginLeft ??= marginHorizontal;
    css.marginRight ??= marginHorizontal;
  }
  return css as CSSProperties;
}

function Box({ style, children }: { style?: Style; children?: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        borderStyle: "solid",
        borderWidth: 0,
        minWidth: 0,
        ...toCss(style),
      }}
    >
      {children}
    </div>
  );
}

function labelFor(k: string): string {
  const [head, sub, sub2] = k.split(".");
  const items: Record<string, string> = {
    no: "No.",
    description: "品目",
    quantity: "数量",
    unitPriceExcl: "単価（税抜）",
    unitPriceIncl: "単価（税込）",
    amountExcl: "金額（税抜）",
    amountIncl: "金額（税込）",
  };
  if (head === "items") return sub === "header" ? `表の見出し（${items[sub2] ?? sub2}）` : items[sub] ?? "明細";
  const map: Record<string, string> = {
    title: "タイトル",
    recipient: "宛名",
    greeting: "挨拶文",
    total: "ご請求金額",
    payment: "支払期限・振込先",
    meta: "発行日・番号",
    issuer: "発行者",
    seal: "押印欄",
    summary: "合計欄",
    taxbreak: "税率別内訳",
    notes: "備考",
  };
  return map[head] ?? k;
}

/** 「2026/10/31」「2026-10-31」「2026年10月31日」などを YYYY-MM-DD に */
function parseDateText(text: string): string | null {
  const m = text.trim().match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return `${m[1]}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseNumber(text: string): number | null {
  const digits = text.replace(/[^\d.-]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

/** 書き換えられる欄。中身はDOMに直接持たせ、編集中はReactが上書きしないようにする */
function EditableField({
  spec,
  selected,
  autoFocus,
  onSelect,
  onCommit,
}: {
  spec: FieldSpec;
  selected: boolean;
  autoFocus: boolean;
  onSelect: (spec: FieldSpec) => void;
  onCommit: (spec: FieldSpec, text: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const editable = spec.edit !== "none";

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerText !== spec.value) {
      el.innerText = spec.value;
    }
  }, [spec.value]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <div
      ref={ref}
      role={editable ? "textbox" : undefined}
      aria-label={labelFor(spec.k)}
      data-field={spec.k}
      tabIndex={editable ? undefined : -1}
      contentEditable={editable ? "plaintext-only" : undefined}
      suppressContentEditableWarning
      onMouseDown={() => onSelect(spec)}
      onFocus={() => onSelect(spec)}
      onBlur={(e) => {
        if (!editable) return;
        const text = e.currentTarget.innerText.replace(/\n$/, "");
        if (text !== spec.value) onCommit(spec, text);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.currentTarget.innerText = spec.value;
          e.currentTarget.blur();
        } else if (e.key === "Enter" && !spec.multiline && !e.nativeEvent.isComposing) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className={`invoice-field ${editable ? "is-editable" : ""} ${selected ? "is-selected" : ""}`}
      style={{
        display: "block",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        minHeight: "1.3em",
        borderStyle: "solid",
        borderWidth: 0,
        ...toCss(spec.style),
      }}
    />
  );
}

export default function InvoiceEditor({
  invoiceId,
  invoice,
  issuer,
  layout,
  overrides: initialOverrides,
  pdfHref,
  xlsxHref,
}: {
  invoiceId: string;
  invoice: DocInvoice;
  issuer: DocIssuer;
  layout: DocumentLayout;
  overrides: DocOverrides;
  pdfHref: string;
  xlsxHref: string;
}) {
  // ---- 請求書のデータ（サーバーの値を元に、編集はすぐ画面に反映する） ----
  const serverData = {
    items: invoice.items,
    notes: invoice.notes,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
  };
  const serverSig = JSON.stringify(serverData);
  const [data, setData] = useState(serverData);
  const [syncedSig, setSyncedSig] = useState(serverSig);
  const [pending, setPending] = useState(0);
  // 保存が終わってサーバーの最新値が届いたら取り込む（脇のフォームでの変更も反映される）
  if (serverSig !== syncedSig && pending === 0) {
    setSyncedSig(serverSig);
    setData(serverData);
  }

  const [overrides, setOverrides] = useState<DocOverrides>(initialOverrides);
  const [overridesDirty, setOverridesDirty] = useState(false);
  const [selected, setSelected] = useState<FieldSpec | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (task: () => Promise<unknown>) => {
    setPending((n) => n + 1);
    setError(null);
    try {
      await task();
    } catch {
      setError("保存できませんでした。通信状況を確認して、もう一度お試しください。");
    } finally {
      setPending((n) => n - 1);
    }
  }, []);

  // 文言・書式は少しまとめてから保存する
  useEffect(() => {
    if (!overridesDirty) return;
    const timer = setTimeout(() => {
      setOverridesDirty(false);
      void run(() => saveInvoiceDocOverrides(invoiceId, overrides));
    }, 600);
    return () => clearTimeout(timer);
  }, [overrides, overridesDirty, invoiceId, run]);

  const updateOverrides = (fn: (o: DocOverrides) => DocOverrides) => {
    setOverrides((o) => fn(o));
    setOverridesDirty(true);
  };

  // ---- 表示倍率（枠の幅に合わせてA4を拡大・縮小） ----
  const frameRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setZoom(Math.min(1.6, entry.contentRect.width / PAGE_WIDTH));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ---- 欄の書き換え ----
  const updateItem = (itemId: string, patch: Partial<Item>) => {
    setData((d) => ({
      ...d,
      items: d.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
    }));
    void run(() => updateInvoiceItemFields(itemId, patch));
  };

  const commit = (spec: FieldSpec, text: string) => {
    const trimmed = text.trim();
    switch (spec.edit) {
      case "text":
        updateOverrides((o) => {
          const next = { ...o.text };
          if (text === spec.defaultValue) delete next[spec.k];
          else next[spec.k] = text;
          return { ...o, text: next };
        });
        return;
      case "description":
        if (spec.itemId) updateItem(spec.itemId, { description: trimmed });
        return;
      case "quantity": {
        const n = parseNumber(trimmed);
        if (spec.itemId && n !== null) updateItem(spec.itemId, { quantity: Math.max(0, Math.round(n)) });
        else setError("数量は数字で入力してください。");
        return;
      }
      case "unitPriceExcl":
      case "unitPriceIncl": {
        const n = parseNumber(trimmed);
        if (!spec.itemId || n === null) {
          setError("単価は数字で入力してください。");
          return;
        }
        // 明細は税込で保存しているので、税抜で入力された単価は税込に直す
        const unitPrice =
          spec.edit === "unitPriceExcl"
            ? Math.round((n * (100 + invoice.taxRate)) / 100)
            : Math.round(n);
        updateItem(spec.itemId, { unitPrice });
        return;
      }
      case "notes":
        setData((d) => ({ ...d, notes: text }));
        void run(() => updateInvoiceDocFields(invoiceId, { notes: text }));
        return;
      case "issueDate":
      case "dueDate": {
        if (spec.edit === "dueDate" && (trimmed === "" || trimmed === "—")) {
          setData((d) => ({ ...d, dueDate: null }));
          void run(() => updateInvoiceDocFields(invoiceId, { dueDate: null }));
          return;
        }
        const iso = parseDateText(trimmed);
        if (!iso) {
          setError("日付は「2026/10/31」の形で入力してください。");
          return;
        }
        const date = new Date(`${iso}T00:00:00Z`);
        setData((d) => ({ ...d, [spec.edit]: date }));
        void run(() => updateInvoiceDocFields(invoiceId, { [spec.edit]: iso }));
        return;
      }
    }
  };

  // ---- ツールバー ----
  const selKey = selected?.k ?? null;
  const selStyle: CellStyle = (selKey && overrides.style[selKey]) || {};
  const baseStyle = (selected?.baseStyle ?? {}) as Record<string, unknown>;
  const currentSize =
    selStyle.fontSize ?? (typeof baseStyle.fontSize === "number" ? baseStyle.fontSize : layout.baseFontSize);
  const currentBold = selStyle.bold ?? baseStyle.fontWeight === "bold";
  const currentAlign =
    selStyle.align ?? (baseStyle.textAlign as CellStyle["align"] | undefined) ?? "left";
  const currentColor = selStyle.color ?? (baseStyle.color as string | undefined);

  const setStyle = (patch: CellStyle) => {
    if (!selKey) return;
    updateOverrides((o) => ({
      ...o,
      style: { ...o.style, [selKey]: { ...o.style[selKey], ...patch } },
    }));
  };
  const resetSelected = () => {
    if (!selKey) return;
    updateOverrides((o) => {
      const text = { ...o.text };
      const style = { ...o.style };
      delete text[selKey];
      delete style[selKey];
      return { text, style };
    });
  };

  const addRow = () =>
    run(async () => {
      const { id } = await addBlankInvoiceItem(invoiceId);
      setData((d) => ({
        ...d,
        items: [...d.items, { id, description: "", quantity: 1, unitPrice: 0 }],
      }));
      setFocusKey(`items.description.${id}`);
    });

  const deleteRow = () => {
    const itemId = selected?.itemId;
    if (!itemId) return;
    if (!window.confirm("この明細の行を削除しますか？")) return;
    setData((d) => ({ ...d, items: d.items.filter((it) => it.id !== itemId) }));
    setSelected(null);
    updateOverrides((o) => ({
      text: o.text,
      style: Object.fromEntries(
        Object.entries(o.style).filter(([k]) => !k.endsWith(`.${itemId}`))
      ),
    }));
    void run(() => deleteInvoiceItem(itemId));
  };

  const saving = pending > 0 || overridesDirty;
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();
  const toolBtn =
    "flex h-8 min-w-8 items-center justify-center rounded-md border border-gray-300 bg-white px-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40";

  const editInvoice: DocInvoice = { ...invoice, ...data };

  return (
    <div className="card overflow-hidden">
      {/* ツールバー（Excelのリボンのイメージ） */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50/95 px-3 py-2 backdrop-blur">
        <span className="min-w-28 truncate text-xs font-semibold text-gray-600">
          {selKey ? `選択中：${labelFor(selKey)}` : "欄をクリックして編集"}
        </span>
        <div className="flex items-center gap-1" onMouseDown={keepFocus}>
          <button
            type="button"
            className={toolBtn}
            disabled={!selKey || currentSize <= FONT_SIZE_MIN}
            onClick={() => setStyle({ fontSize: Math.max(FONT_SIZE_MIN, currentSize - 1) })}
            title="文字を小さく"
          >
            A−
          </button>
          <span className="w-8 text-center text-sm tabular-nums text-gray-700">
            {selKey ? Math.round(currentSize * 10) / 10 : "—"}
          </span>
          <button
            type="button"
            className={toolBtn}
            disabled={!selKey || currentSize >= FONT_SIZE_MAX}
            onClick={() => setStyle({ fontSize: Math.min(FONT_SIZE_MAX, currentSize + 1) })}
            title="文字を大きく"
          >
            A＋
          </button>
          <button
            type="button"
            className={`${toolBtn} ${currentBold && selKey ? "border-sky-500 bg-sky-50 text-sky-800" : ""}`}
            disabled={!selKey}
            onClick={() => setStyle({ bold: !currentBold })}
            title="太字"
          >
            B
          </button>
        </div>
        <div className="flex items-center gap-1" onMouseDown={keepFocus}>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              disabled={!selKey}
              onClick={() => setStyle({ color: c })}
              title="文字の色"
              aria-label={`文字の色 ${c}`}
              className={`size-6 rounded-full border-2 disabled:opacity-40 ${
                selKey && currentColor === c ? "border-sky-500" : "border-white"
              }`}
              style={{ backgroundColor: c, boxShadow: "0 0 0 1px #d1d5db" }}
            />
          ))}
        </div>
        <div className="flex items-center gap-1" onMouseDown={keepFocus}>
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              type="button"
              className={`${toolBtn} ${selKey && currentAlign === a ? "border-sky-500 bg-sky-50 text-sky-800" : ""}`}
              disabled={!selKey}
              onClick={() => setStyle({ align: a })}
              title={a === "left" ? "左揃え" : a === "center" ? "中央揃え" : "右揃え"}
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
                {a === "left" && <path d="M2 3h12v1.5H2zm0 4h8v1.5H2zm0 4h12v1.5H2z" />}
                {a === "center" && <path d="M2 3h12v1.5H2zm2 4h8v1.5H4zm-2 4h12v1.5H2z" />}
                {a === "right" && <path d="M2 3h12v1.5H2zm4 4h8v1.5H6zm-4 4h12v1.5H2z" />}
              </svg>
            </button>
          ))}
          <button
            type="button"
            className={toolBtn}
            disabled={!selKey || (!overrides.style[selKey] && overrides.text[selKey] === undefined)}
            onClick={resetSelected}
            title="この欄の文言・書式を元に戻す"
          >
            元に戻す
          </button>
        </div>
        <div className="flex items-center gap-1" onMouseDown={keepFocus}>
          <button type="button" className={toolBtn} onClick={addRow}>
            ＋ 行を追加
          </button>
          <button
            type="button"
            className={toolBtn}
            disabled={!selected?.itemId}
            onClick={deleteRow}
          >
            行を削除
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-xs ${error ? "text-red-600" : "text-gray-500"}`} aria-live="polite">
            {error ?? (saving ? "保存中…" : "✓ 保存済み")}
          </span>
          <a
            href={pdfHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn-primary px-3 py-1.5 ${saving ? "pointer-events-none opacity-50" : ""}`}
          >
            PDF
          </a>
          <a
            href={xlsxHref}
            className={`btn-secondary px-3 py-1.5 ${saving ? "pointer-events-none opacity-50" : ""}`}
          >
            Excel
          </a>
        </div>
      </div>

      <p className="border-b border-gray-100 bg-white px-4 py-2 text-xs text-gray-600">
        クリックしてそのまま書き換えられます。品目・数量・単価・日付・備考は請求書のデータとして保存され、金額と合計は自動で計算し直されます。
      </p>

      {/* A4の紙面 */}
      <div className="bg-gray-200/70 p-3 sm:p-5">
        <div ref={frameRef} className="mx-auto w-full max-w-[952px]">
          <div
            className="invoice-paper bg-white shadow-md"
            style={{
              width: PAGE_WIDTH,
              minHeight: PAGE_HEIGHT,
              zoom,
              ...toCss(pageStyle(layout)),
              fontFamily: "NotoSansJP, sans-serif",
              lineHeight: 1.2,
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSelected(null);
            }}
          >
            <InvoiceDocument
              invoice={editInvoice}
              issuer={issuer}
              layout={layout}
              overrides={overrides}
              Box={Box}
              renderField={(spec) => (
                <EditableField
                  key={spec.k}
                  spec={spec}
                  selected={spec.k === selKey}
                  autoFocus={spec.k === focusKey}
                  onSelect={setSelected}
                  onCommit={commit}
                />
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
