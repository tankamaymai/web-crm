"use client";

import { useState, useTransition } from "react";
import {
  createInvoiceTemplate,
  deleteInvoiceTemplate,
  updateInvoiceTemplate,
} from "@/app/actions/invoiceTemplates";
import { TAX_MODES, TAX_MODE_LABELS } from "@/lib/invoice";

export type TemplateItemDto = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type TemplateDto = {
  id: string;
  name: string;
  notes: string | null;
  taxMode: string | null;
  items: TemplateItemDto[];
};

type Row = TemplateItemDto & { key: number };

let nextKey = 1;
function emptyRow(): Row {
  return { key: nextKey++, description: "", quantity: 1, unitPrice: 0 };
}

function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function TemplateForm({
  template,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  template?: TemplateDto;
  submitLabel: string;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(
    template && template.items.length > 0
      ? template.items.map((item) => ({ ...item, key: nextKey++ }))
      : [emptyRow()]
  );

  const total = rows.reduce((sum, r) => sum + r.quantity * r.unitPrice, 0);
  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm";

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <form
      action={onSubmit}
      className="space-y-3 rounded-lg border border-sky-200 bg-sky-50/50 p-4"
    >
      <label className="block">
        <span className="text-sm text-gray-600">テンプレート名 *</span>
        <input
          name="name"
          required
          autoFocus
          defaultValue={template?.name}
          placeholder="例: LP制作一式"
          className={`mt-1 ${inputClass}`}
        />
      </label>

      <div>
        <span className="text-sm text-gray-600">明細</span>
        <div className="mt-1 space-y-2">
          {rows.map((row, i) => (
            <div key={row.key} className="flex flex-col gap-2 sm:flex-row">
              <input
                name="description"
                value={row.description}
                onChange={(e) =>
                  updateRow(row.key, { description: e.target.value })
                }
                placeholder={`品目 ${i + 1}`}
                className={`min-w-0 flex-1 ${inputClass}`}
              />
              <input
                name="quantity"
                type="number"
                min={1}
                value={row.quantity}
                onChange={(e) =>
                  updateRow(row.key, { quantity: Number(e.target.value) || 1 })
                }
                aria-label="数量"
                className={`sm:w-20 ${inputClass}`}
              />
              <input
                name="unitPrice"
                type="number"
                min={0}
                value={row.unitPrice}
                onChange={(e) =>
                  updateRow(row.key, { unitPrice: Number(e.target.value) || 0 })
                }
                placeholder="単価（税込）"
                aria-label="単価（税込）"
                className={`sm:w-36 ${inputClass}`}
              />
              <button
                type="button"
                onClick={() =>
                  setRows((prev) =>
                    prev.length === 1
                      ? [emptyRow()]
                      : prev.filter((r) => r.key !== row.key)
                  )
                }
                aria-label="この行を削除"
                className="shrink-0 self-center px-1 text-gray-300 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
          className="mt-2 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700"
        >
          + 明細行を追加
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-gray-600">消費税の計算方法</span>
          <select
            name="taxMode"
            defaultValue={template?.taxMode ?? ""}
            className={`mt-1 ${inputClass}`}
          >
            <option value="">顧客の設定に従う</option>
            {TAX_MODES.map((m) => (
              <option key={m} value={m}>
                {TAX_MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">備考</span>
          <input
            name="notes"
            defaultValue={template?.notes ?? ""}
            placeholder="未入力なら設定のデフォルトを使います"
            className={`mt-1 ${inputClass}`}
          />
        </label>
      </div>

      <p className="text-right text-sm text-gray-600">
        合計（税込）
        <strong className="ml-2 tabular-nums text-slate-800">
          {yen(total)}
        </strong>
      </p>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

function TemplateRow({ template }: { template: TemplateDto }) {
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  if (editing) {
    return (
      <li>
        <TemplateForm
          template={template}
          submitLabel="保存する"
          onCancel={() => setEditing(false)}
          onSubmit={(formData) =>
            startTransition(async () => {
              await updateInvoiceTemplate(template.id, formData);
              setEditing(false);
            })
          }
        />
      </li>
    );
  }

  const total = template.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  return (
    <li className="group rounded-lg border border-gray-200 p-4 hover:border-gray-300">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="font-bold">{template.name}</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
          {template.items.length}明細
        </span>
        <span className="ml-auto tabular-nums text-sm text-gray-600">
          {yen(total)}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
          >
            編集
          </button>
          <button
            type="button"
            onClick={() => {
              if (!window.confirm(`「${template.name}」を削除しますか？`)) return;
              startTransition(() => deleteInvoiceTemplate(template.id));
            }}
            className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-red-50 hover:text-red-500"
          >
            削除
          </button>
        </div>
      </div>
      <ul className="space-y-0.5 text-sm text-gray-600">
        {template.items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate">{item.description}</span>
            <span className="shrink-0 text-xs text-gray-400">
              {item.quantity} ×
            </span>
            <span className="shrink-0 tabular-nums">{yen(item.unitPrice)}</span>
          </li>
        ))}
      </ul>
      {template.notes && (
        <p className="mt-2 truncate text-xs text-gray-400">
          備考: {template.notes}
        </p>
      )}
    </li>
  );
}

export default function InvoiceTemplateManager({
  templates,
}: {
  templates: TemplateDto[];
}) {
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          + テンプレートを追加
        </button>
      )}

      {adding && (
        <TemplateForm
          submitLabel="追加する"
          onCancel={() => setAdding(false)}
          onSubmit={(formData) =>
            startTransition(async () => {
              await createInvoiceTemplate(formData);
              setAdding(false);
            })
          }
        />
      )}

      {templates.length === 0 && !adding ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white/60 p-8 text-center text-sm text-gray-500">
          よく使う請求内容をテンプレートにしておくと、請求書作成時にワンクリックで明細を入れられます。
        </p>
      ) : (
        <ul className="space-y-3">
          {templates.map((t) => (
            <TemplateRow key={t.id} template={t} />
          ))}
        </ul>
      )}
    </div>
  );
}
