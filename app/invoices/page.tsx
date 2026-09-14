import { prisma } from "@/lib/prisma";
import { setInvoiceStatus } from "@/app/actions/invoices";
import { calcInvoiceTotals } from "@/lib/invoice";
import { formatDate, formatYen, todayJST } from "@/lib/dates";
import { INVOICE_STATUS_LABELS } from "@/lib/status";
import PageHeader from "@/components/PageHeader";
import { InvoiceStatusBadge } from "@/components/StatusBadge";
import CelebrateButton from "@/components/CelebrateButton";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";

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
  await requireAuth();
  const { status = "all" } = await searchParams;
  const today = todayJST();

  const [invoices, sentInvoices] = await Promise.all([
    prisma.invoice.findMany({
      where: status === "all" ? {} : { status },
      include: {
        client: true,
        items: { include: { project: { select: { id: true, title: true } } } },
      },
      orderBy: { invoiceNumber: "desc" },
    }),
    prisma.invoice.findMany({
      where: { status: "SENT" },
      include: { items: true },
    }),
  ]);

  const totalOf = (inv: {
    items: { quantity: number; unitPrice: number }[];
    taxRate: number;
    taxMode: string;
    issueDate: Date;
  }) =>
    calcInvoiceTotals(inv.items, inv.taxRate, inv.taxMode, inv.issueDate).total;

  const unpaidTotal = sentInvoices.reduce((sum, inv) => sum + totalOf(inv), 0);
  const overdue = sentInvoices.filter(
    (inv) => inv.dueDate && inv.dueDate < today
  );
  const overdueTotal = overdue.reduce((sum, inv) => sum + totalOf(inv), 0);

  return (
    <div>
      <PageHeader
        title="請求書"
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/invoices/templates"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              📄 テンプレート
            </Link>
            <Link
              href="/invoices/new"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              + 新規請求書
            </Link>
          </div>
        }
      />

      {(unpaidTotal > 0 || overdue.length > 0) && (
        <div className="mb-4 flex flex-wrap gap-3">
          {unpaidTotal > 0 && (
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800">
              未入金合計:{" "}
              <strong className="tabular-nums">{formatYen(unpaidTotal)}</strong>
            </span>
          )}
          {overdue.length > 0 && (
            <span className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700">
              ⚠️ 支払期限超過 {overdue.length}件:{" "}
              <strong className="tabular-nums">{formatYen(overdueTotal)}</strong>
            </span>
          )}
        </div>
      )}

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
                  請求書はありません。「+ 新規請求書」から作成できます。
                </td>
              </tr>
            )}
            {invoices.map((inv) => {
              const total = totalOf(inv);
              // 明細に紐づく案件を重複なく取り出す
              const linkedProjects = [
                ...new Map(
                  inv.items
                    .filter((item) => item.project)
                    .map((item) => [item.project!.id, item.project!])
                ).values(),
              ];
              const isOverdue =
                inv.status === "SENT" && inv.dueDate && inv.dueDate < today;
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
                    {linkedProjects.length === 0 ? (
                      "—"
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {linkedProjects.map((p) => (
                          <Link
                            key={p.id}
                            href={`/projects/${p.id}`}
                            className="max-w-48 truncate rounded bg-gray-100 px-1.5 py-0.5 text-xs hover:text-sky-600"
                          >
                            {p.title}
                          </Link>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{formatDate(inv.issueDate)}</td>
                  <td className="px-4 py-3">
                    {isOverdue ? (
                      <span className="rounded bg-red-50 px-1.5 py-0.5 font-medium text-red-600">
                        {formatDate(inv.dueDate)} 超過
                      </span>
                    ) : (
                      formatDate(inv.dueDate)
                    )}
                  </td>
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
                        <CelebrateButton className="text-xs rounded-lg bg-emerald-600 text-white px-2.5 py-1 hover:bg-emerald-700">
                          入金済みにする
                        </CelebrateButton>
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
