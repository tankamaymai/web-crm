import { prisma } from "@/lib/prisma";
import {
  addInvoiceItem,
  addProjectsToInvoice,
  deleteInvoice,
  deleteInvoiceItem,
  setInvoiceStatus,
  updateInvoice,
} from "@/app/actions/invoices";
import { calcInvoiceTotals, transitionalDeductionRate } from "@/lib/invoice";
import { formatDate, formatYen, toDateInputValue } from "@/lib/dates";
import PageHeader from "@/components/PageHeader";
import { InvoiceStatusBadge } from "@/components/StatusBadge";
import CelebrateButton from "@/components/CelebrateButton";
import SaveAsTemplateButton from "@/components/SaveAsTemplateButton";
import DeleteButton from "@/components/DeleteButton";
import TaxModeSelect from "@/components/TaxModeSelect";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      items: {
        orderBy: { sortOrder: "asc" },
        include: { project: { select: { id: true, title: true } } },
      },
    },
  });
  if (!invoice) notFound();

  // 宛先顧客の案件（明細の紐付け先候補）
  const clientProjects = await prisma.project.findMany({
    where: { clientId: invoice.clientId, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, amount: true },
  });
  const linkedProjectIds = new Set(
    invoice.items.map((item) => item.projectId).filter(Boolean)
  );
  const linkedProjects = [
    ...new Map(
      invoice.items
        .filter((item) => item.project)
        .map((item) => [item.project!.id, item.project!])
    ).values(),
  ];
  const addableProjects = clientProjects.filter(
    (p) => !linkedProjectIds.has(p.id)
  );

  const { subtotal, taxAmount, adjustment, total } = calcInvoiceTotals(
    invoice.items,
    invoice.taxRate,
    invoice.taxMode,
    invoice.issueDate
  );
  const deductionPercent = Math.round(
    transitionalDeductionRate(invoice.issueDate) * 100
  );
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm";

  return (
    <div>
      <PageHeader
        title={`請求書 ${invoice.invoiceNumber}`}
        action={
          <div className="flex flex-wrap gap-3 items-center">
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-medium hover:bg-sky-700"
            >
              📄 PDFダウンロード
            </a>
            {invoice.status === "DRAFT" && (
              <form action={setInvoiceStatus.bind(null, invoice.id, "SENT")}>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 text-white px-4 py-2 text-sm font-medium hover:bg-amber-600"
                >
                  発行済みにする
                </button>
              </form>
            )}
            {invoice.status === "SENT" && (
              <form action={setInvoiceStatus.bind(null, invoice.id, "PAID")}>
                <CelebrateButton className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700">
                  入金済みにする
                </CelebrateButton>
              </form>
            )}
            <SaveAsTemplateButton
              invoiceId={invoice.id}
              defaultName={
                invoice.items[0]?.description ?? invoice.invoiceNumber
              }
            />
            <DeleteButton
              action={deleteInvoice.bind(null, invoice.id)}
              confirmMessage={`請求書 ${invoice.invoiceNumber} を削除しますか？`}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="font-bold">明細</h2>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <InvoiceStatusBadge status={invoice.status} />
                {invoice.paidAt && (
                  <span>入金日: {formatDate(invoice.paidAt)}</span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm mb-4">
              <thead className="text-gray-500 text-left border-b border-gray-200">
                <tr>
                  <th className="py-2 font-medium">品目</th>
                  <th className="py-2 font-medium text-right w-20">数量</th>
                  <th className="py-2 font-medium text-right w-32">単価(税込)</th>
                  <th className="py-2 font-medium text-right w-32">金額(税込)</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5">
                      <span className="block">{item.description}</span>
                      {item.project && (
                        <Link
                          href={`/projects/${item.project.id}`}
                          className="mt-1 inline-block max-w-full truncate rounded bg-gray-100 px-1.5 py-0.5 align-top text-xs text-gray-500 hover:text-sky-600"
                        >
                          {item.project.title}
                        </Link>
                      )}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {formatYen(item.unitPrice)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {formatYen(item.quantity * item.unitPrice)}
                    </td>
                    <td className="py-2.5 text-right">
                      <DeleteButton
                        action={deleteInvoiceItem.bind(null, item.id)}
                        label="✕"
                        confirmMessage="この明細を削除しますか？"
                        className="text-gray-400 hover:text-red-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-200">
                <tr>
                  <td colSpan={3} className="py-2 text-right text-gray-500">
                    小計（税抜 {formatYen(subtotal)}）
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatYen(subtotal + taxAmount)}
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-1 text-right text-gray-500">
                    {invoice.taxMode === "STANDARD"
                      ? `内 消費税（${invoice.taxRate}%）`
                      : `内 消費税相当額（${invoice.taxRate}%）`}
                  </td>
                  <td className="py-1 text-right tabular-nums">
                    {formatYen(taxAmount)}
                  </td>
                  <td></td>
                </tr>
                {adjustment !== 0 && (
                  <tr>
                    <td colSpan={3} className="py-1 text-right text-orange-600">
                      経過措置調整（インボイス未登録・控除{deductionPercent}%）
                    </td>
                    <td className="py-1 text-right tabular-nums text-orange-600">
                      −{formatYen(-adjustment)}
                    </td>
                    <td></td>
                  </tr>
                )}
                <tr className="font-bold text-base">
                  <td colSpan={3} className="py-2 text-right">
                    合計（税込）
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatYen(total)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <form
                action={addInvoiceItem.bind(null, invoice.id)}
                className="flex flex-wrap gap-2"
              >
                <input
                  name="description"
                  required
                  placeholder="品目を追加..."
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <select
                  name="itemProjectId"
                  defaultValue=""
                  className="max-w-44 rounded-lg border border-gray-300 px-2 py-2 text-sm text-gray-600"
                  aria-label="紐付ける案件"
                >
                  <option value="">案件なし</option>
                  {clientProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <input
                  name="quantity"
                  type="number"
                  min={1}
                  defaultValue={1}
                  className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  name="unitPrice"
                  type="number"
                  min={0}
                  placeholder="単価（税込）"
                  className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm hover:bg-slate-700"
                >
                  追加
                </button>
              </form>

              {addableProjects.length > 0 && (
                <form
                  action={addProjectsToInvoice.bind(null, invoice.id)}
                  className="rounded-lg border border-sky-200 bg-sky-50/60 p-3"
                >
                  <p className="mb-2 text-sm font-medium text-sky-900">
                    この顧客の他の案件をまとめて明細に追加
                  </p>
                  <ul className="mb-2 space-y-1">
                    {addableProjects.map((p) => (
                      <li key={p.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-white/70">
                          <input
                            type="checkbox"
                            name="projectIds"
                            value={p.id}
                            className="size-4 accent-sky-600"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {p.title}
                          </span>
                          <span className="tabular-nums text-gray-600">
                            {formatYen(
                              Math.round(
                                (p.amount * (100 + invoice.taxRate)) / 100
                              )
                            )}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="submit"
                    className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
                  >
                    選んだ案件を明細に追加
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-sm">
            <h2 className="font-bold mb-4">請求情報</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-gray-500">宛先</dt>
                <dd className="font-medium">
                  {invoice.client.name}
                  {invoice.client.company && ` / ${invoice.client.company}`}
                </dd>
              </div>
              {linkedProjects.length > 0 && (
                <div>
                  <dt className="text-gray-500">
                    関連案件
                    {linkedProjects.length > 1 && (
                      <span className="ml-1.5 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                        {linkedProjects.length}件をまとめて請求
                      </span>
                    )}
                  </dt>
                  <dd className="mt-0.5 space-y-0.5">
                    {linkedProjects.map((p) => (
                      <Link
                        key={p.id}
                        href={`/projects/${p.id}`}
                        className="block text-sky-700 hover:underline"
                      >
                        {p.title}
                      </Link>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold mb-4 text-sm">編集</h2>
            <form
              action={updateInvoice.bind(null, invoice.id)}
              className="space-y-3"
            >
              <label className="block">
                <span className="text-sm text-gray-600">発行日</span>
                <input
                  name="issueDate"
                  type="date"
                  defaultValue={toDateInputValue(invoice.issueDate)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-600">支払期限</span>
                <input
                  name="dueDate"
                  type="date"
                  defaultValue={toDateInputValue(invoice.dueDate)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-600">消費税率（%）</span>
                <input
                  name="taxRate"
                  type="number"
                  min={0}
                  defaultValue={invoice.taxRate}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-600">消費税の計算方法</span>
                <TaxModeSelect defaultValue={invoice.taxMode} />
              </label>
              <label className="block">
                <span className="text-sm text-gray-600">備考</span>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={invoice.notes ?? ""}
                  className={inputClass}
                />
              </label>
              <button
                type="submit"
                className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-medium hover:bg-sky-700"
              >
                保存する
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
