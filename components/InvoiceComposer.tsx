"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createInvoice } from "@/app/actions/invoices";
import { TAX_MODES, TAX_MODE_LABELS } from "@/lib/invoice";

export type ComposerClient = {
  id: string;
  name: string;
  company: string | null;
  taxMode: string;
};

export type ComposerTemplate = {
  id: string;
  name: string;
  notes: string | null;
  taxMode: string | null;
  items: { description: string; quantity: number; unitPrice: number }[];
};

export type ComposerProject = {
  id: string;
  clientId: string;
  title: string;
  /** 税別・円 */
  amount: number;
  statusLabel: string;
  billed: boolean;
};

type Row = {
  key: number;
  description: string;
  quantity: number;
  unitPrice: number;
  projectId: string;
};

let nextKey = 1;
function emptyRow(): Row {
  return {
    key: nextKey++,
    description: "",
    quantity: 1,
    unitPrice: 0,
    projectId: "",
  };
}

function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export default function InvoiceComposer({
  clients,
  projects,
  templates,
  defaultTaxRate,
  todayStr,
  defaultDueDateStr,
  defaultNotes,
}: {
  clients: ComposerClient[];
  projects: ComposerProject[];
  templates: ComposerTemplate[];
  defaultTaxRate: number;
  todayStr: string;
  defaultDueDateStr: string;
  defaultNotes: string;
}) {
  const [clientId, setClientId] = useState("");
  const [taxRate, setTaxRate] = useState(defaultTaxRate);
  const [taxMode, setTaxMode] = useState("STANDARD");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [notes, setNotes] = useState(defaultNotes);

  const clientProjects = useMemo(
    () => projects.filter((p) => p.clientId === clientId),
    [projects, clientId]
  );

  const total = rows.reduce((sum, r) => sum + r.quantity * r.unitPrice, 0);
  const taxAmount = Math.floor((total * taxRate) / (100 + taxRate));

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r))
    );

  const handleClientChange = (id: string) => {
    setClientId(id);
    const client = clients.find((c) => c.id === id);
    if (client) setTaxMode(client.taxMode);
    // 顧客が変わると案件の紐付けが無効になるので外す
    setRows((prev) => prev.map((r) => ({ ...r, projectId: "" })));
  };

  /** テンプレートの明細を流し込む。備考・税区分も指定があれば反映する */
  const applyTemplate = (template: ComposerTemplate) => {
    const newRows = template.items.map((item) => ({
      ...emptyRow(),
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));
    setRows((prev) => {
      const meaningful = prev.filter((r) => r.description.trim() !== "");
      return [...meaningful, ...newRows];
    });
    if (template.taxMode) setTaxMode(template.taxMode);
    if (template.notes) setNotes(template.notes);
    setTemplateOpen(false);
  };

  /** 選んだ案件を明細行として流し込む（税別→税込に換算） */
  const addProjects = (selected: ComposerProject[]) => {
    const newRows = selected.map((p) => ({
      ...emptyRow(),
      description: p.title,
      quantity: 1,
      unitPrice: Math.round((p.amount * (100 + taxRate)) / 100),
      projectId: p.id,
    }));
    setRows((prev) => {
      // 空行しかない場合は置き換える
      const meaningful = prev.filter((r) => r.description.trim() !== "");
      return [...meaningful, ...newRows];
    });
    setPickerOpen(false);
  };

  const labelClass = "text-sm text-gray-600";
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm";

  return (
    <form action={createInvoice} className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold">請求先・条件</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={labelClass}>顧客 *</span>
            <select
              name="clientId"
              required
              value={clientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                選択してください
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? `（${c.company}）` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>発行日</span>
            <input
              name="issueDate"
              type="date"
              defaultValue={todayStr}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>支払期限</span>
            <input
              name="dueDate"
              type="date"
              defaultValue={defaultDueDateStr}
              className={inputClass}
            />
            <span className="mt-1 block text-xs text-gray-400">
              初期値は発行月の翌月末日です
            </span>
          </label>
          <label className="block">
            <span className={labelClass}>消費税率（%）</span>
            <input
              name="taxRate"
              type="number"
              min={0}
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>消費税の計算方法</span>
            <select
              name="taxMode"
              value={taxMode}
              onChange={(e) => setTaxMode(e.target.value)}
              className={inputClass}
            >
              {TAX_MODES.map((m) => (
                <option key={m} value={m}>
                  {TAX_MODE_LABELS[m]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">明細</h2>
          <div className="flex flex-wrap gap-2">
            {templates.length > 0 && (
              <button
                type="button"
                onClick={() => setTemplateOpen((v) => !v)}
                className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-100"
              >
                📄 テンプレートから追加
              </button>
            )}
            {clientId && clientProjects.length > 0 && (
              <button
                type="button"
                onClick={() => setPickerOpen((v) => !v)}
                className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-100"
              >
                📁 案件から明細を追加
              </button>
            )}
          </div>
        </div>

        {templateOpen && (
          <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50/60 p-3">
            <p className="mb-2 text-sm font-medium text-violet-900">
              使うテンプレートを選んでください
            </p>
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {templates.map((t) => {
                const templateTotal = t.items.reduce(
                  (sum, item) => sum + item.quantity * item.unitPrice,
                  0
                );
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-white"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {t.name}
                        </span>
                        <span className="block truncate text-xs text-gray-500">
                          {t.items.map((item) => item.description).join(" / ")}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums text-gray-600">
                        {yen(templateTotal)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex justify-between border-t border-violet-200 pt-2">
              <Link
                href="/invoices/templates"
                className="text-xs text-violet-700 hover:underline"
              >
                テンプレートを編集する
              </Link>
              <button
                type="button"
                onClick={() => setTemplateOpen(false)}
                className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-white"
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        {!clientId && (
          <p className="mb-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
            先に顧客を選ぶと、その顧客の案件から明細をまとめて追加できます。
          </p>
        )}

        {pickerOpen && (
          <ProjectPicker
            projects={clientProjects}
            taxRate={taxRate}
            onAdd={addProjects}
            onClose={() => setPickerOpen(false)}
          />
        )}

        <div className="space-y-3">
          {rows.map((row, i) => (
            <div
              key={row.key}
              className="rounded-lg border border-gray-200 p-3 sm:border-0 sm:p-0"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <input
                    name="description"
                    value={row.description}
                    onChange={(e) =>
                      updateRow(row.key, { description: e.target.value })
                    }
                    placeholder={`品目 ${i + 1}（例: コーポレートサイト制作費）`}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <select
                    name="itemProjectId"
                    value={row.projectId}
                    onChange={(e) =>
                      updateRow(row.key, { projectId: e.target.value })
                    }
                    className="mt-1.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-600"
                  >
                    <option value="">案件に紐付けない</option>
                    {clientProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  name="quantity"
                  type="number"
                  min={1}
                  value={row.quantity}
                  onChange={(e) =>
                    updateRow(row.key, { quantity: Number(e.target.value) || 1 })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:w-20"
                  aria-label="数量"
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:w-36"
                  aria-label="単価（税込）"
                />
                <div className="flex items-center gap-2 sm:w-32 sm:justify-end sm:pt-2">
                  <span className="text-sm tabular-nums text-gray-600">
                    {yen(row.quantity * row.unitPrice)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setRows((prev) =>
                        prev.length === 1
                          ? [emptyRow()]
                          : prev.filter((r) => r.key !== row.key)
                      )
                    }
                    className="text-gray-300 hover:text-red-500"
                    aria-label="この行を削除"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
          className="mt-3 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700"
        >
          + 明細行を追加
        </button>

        <div className="mt-4 border-t border-gray-100 pt-3 text-right text-sm">
          <p className="text-gray-500">
            内 消費税（{taxRate}%）
            <span className="ml-2 tabular-nums">{yen(taxAmount)}</span>
          </p>
          <p className="mt-1 text-lg font-bold">
            合計（税込）
            <span className="ml-2 tabular-nums">{yen(total)}</span>
          </p>
          {taxMode !== "STANDARD" && (
            <p className="mt-1 text-xs text-orange-600">
              インボイス調整により、保存後の請求額はこの金額から調整されます。
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <label className="block">
          <span className={labelClass}>備考</span>
          <textarea
            name="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!clientId}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-40"
        >
          この内容で作成する
        </button>
        <Link
          href="/invoices"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
        >
          キャンセル
        </Link>
      </div>
    </form>
  );
}

function ProjectPicker({
  projects,
  taxRate,
  onAdd,
  onClose,
}: {
  projects: ComposerProject[];
  taxRate: number;
  onAdd: (selected: ComposerProject[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const chosen = projects.filter((p) => selected.includes(p.id));
  const total = chosen.reduce(
    (sum, p) => sum + Math.round((p.amount * (100 + taxRate)) / 100),
    0
  );

  return (
    <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50/60 p-3">
      <p className="mb-2 text-sm font-medium text-sky-900">
        まとめる案件を選んでください（複数選択できます）
      </p>
      <ul className="space-y-1">
        {projects.map((p) => (
          <li key={p.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-white/70">
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={(e) =>
                  setSelected((prev) =>
                    e.target.checked
                      ? [...prev, p.id]
                      : prev.filter((id) => id !== p.id)
                  )
                }
                className="size-4 accent-sky-600"
              />
              <span className="min-w-0 flex-1 truncate">{p.title}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500">
                {p.statusLabel}
              </span>
              {p.billed && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                  請求済みあり
                </span>
              )}
              <span className="tabular-nums text-gray-600">
                {yen(Math.round((p.amount * (100 + taxRate)) / 100))}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-sky-200 pt-2">
        <span className="text-sm text-sky-900">
          {chosen.length}件・合計{" "}
          <strong className="tabular-nums">{yen(total)}</strong>（税込）
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-white"
          >
            閉じる
          </button>
          <button
            type="button"
            disabled={chosen.length === 0}
            onClick={() => onAdd(chosen)}
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-40"
          >
            明細に追加
          </button>
        </div>
      </div>
    </div>
  );
}
