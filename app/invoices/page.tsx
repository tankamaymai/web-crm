import { prisma } from "@/lib/prisma";
import { setInvoiceStatus } from "@/app/actions/invoices";
import { calcInvoiceTotals } from "@/lib/invoice";
import { formatDate, formatYen } from "@/lib/dates";
import { INVOICE_STATUS_LABELS } from "@/lib/status";
import PageHeader from "@/components/PageHeader";
import { InvoiceStatusBadge } from "@/components/StatusBadge";
import Link from "next/link";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "すべて" },
  ...Object.entries(INVOICE_STATUS_LABELS).map(([key, label]) => ({
    key,
    label,
  })),
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "all" } = await searchParams;
  const invoices = await prisma.invoice.findMany({
    where: status === "all" ? {} : { status },
    include: { client: true, project: true, items: true },
    orderBy: { invoiceNumber: "desc" },
  });

  const unpaidTotal = (
    await prisma.invoice.findMany({
      where: { status: "SENT" },
      include: { items: true },
    })
  ).reduce(
    (sum, inv) =>
      sum +
      calcInvoiceTotals(inv.items, inv.taxRate, inv.taxMode, inv.issueDate)
        .total,
    0
  );

  return (
    <div>
      <PageHeader
        title="請求書"
        action={
          unpaidTotal > 0 ? (
            <span className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              未入金合計: <strong className="tabular-nums">{formatYen(unpaidTotal)}</strong>
            </span>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/invoices" : `/invoices?status=${f.key}`}
            className={`rounded-full px-3 py-1 text-sm border ${
              status === f.key
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[900px] whitespace-nowrap text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">請求書番号</th>
              <th className="px-4 py-3 font-medium">宛先</th>
              <th className="px-4 py-3 font-medium">案件</th>
              <th className="px-4 py-3 font-medium">発行日</th>
              <th className="px-4 py-3 font-medium">支払期限</th>
              <th className="px-4 py-3 font-medium text-right">金額（税込）</th>
              <th className="px-4 py-3 font-medium">ステータス</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  請求書はありません。案件詳細の「請求書を発行」から作成できます。
                </td>
              </tr>
            )}
            {invoices.map((inv) => {
              const { total } = calcInvoiceTotals(
                inv.items,
                inv.taxRate,
                inv.taxMode,
                inv.issueDate
              );
              return (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-medium text-sky-700 hover:underline"
                    >
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{inv.client.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {inv.project ? (
                      <Link
                        href={`/projects/${inv.project.id}`}
                        className="hover:underline"
                      >
                        {inv.project.title}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">{formatDate(inv.issueDate)}</td>
                  <td className="px-4 py-3">{formatDate(inv.dueDate)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {formatYen(total)}
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {inv.status === "SENT" && (
                      <form
                        action={setInvoiceStatus.bind(null, inv.id, "PAID")}
                        className="inline"
                      >
                        <button
                          type="submit"
                          className="text-xs rounded-lg bg-emerald-600 text-white px-2.5 py-1 hover:bg-emerald-700"
                        >
                          入金済みにする
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
