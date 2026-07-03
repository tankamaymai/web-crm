import { prisma } from "@/lib/prisma";
import {
  addInvoiceItem,
  deleteInvoice,
  deleteInvoiceItem,
  setInvoiceStatus,
  updateInvoice,
} from "@/app/actions/invoices";
import { calcInvoiceTotals, transitionalDeductionRate } from "@/lib/invoice";
import { formatDate, formatYen, toDateInputValue } from "@/lib/dates";
import PageHeader from "@/components/PageHeader";
import { InvoiceStatusBadge } from "@/components/StatusBadge";
import DeleteButton from "@/components/DeleteButton";
import TaxModeSelect from "@/components/TaxModeSelect";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      project: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice) notFound();

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
          <div className="flex gap-3 items-center">
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
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
                >
                  入金済みにする
                </button>
              </form>
            )}
            <DeleteButton
              action={deleteInvoice.bind(null, invoice.id)}
              confirmMessage={`請求書 ${invoice.invoiceNumber} を削除しますか？`}
            />
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">明細</h2>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <InvoiceStatusBadge status={invoice.status} />
                {invoice.paidAt && (
                  <span>入金日: {formatDate(invoice.paidAt)}</span>
                )}
              </div>
            </div>
            <table className="w-full text-sm mb-4">
              <thead className="text-gray-500 text-left border-b border-gray-200">
                <tr>
                  <th className="py-2 font-medium">品目</th>
                  <th className="py-2 font-medium text-right w-20">数量</th>
                  <th className="py-2 font-medium text-right w-32">単価</th>
                  <th className="py-2 font-medium text-right w-32">金額</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5">{item.description}</td>
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
                    小計（税抜）
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatYen(subtotal)}
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-1 text-right text-gray-500">
                    {invoice.taxMode === "STANDARD"
                      ? `消費税（${invoice.taxRate}%）`
                      : `消費税相当額（${invoice.taxRate}%）`}
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

            <form
              action={addInvoiceItem.bind(null, invoice.id)}
              className="flex gap-2 border-t border-gray-100 pt-4"
            >
              <input
                name="description"
                required
                placeholder="品目を追加..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
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
                placeholder="単価"
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm hover:bg-slate-700"
              >
                追加
              </button>
            </form>
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
              {invoice.project && (
                <div>
                  <dt className="text-gray-500">案件</dt>
                  <dd>
                    <Link
                      href={`/projects/${invoice.project.id}`}
                      className="text-sky-700 hover:underline"
                    >
                      {invoice.project.title}
                    </Link>
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
