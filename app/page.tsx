import { prisma } from "@/lib/prisma";
import { toggleTask } from "@/app/actions/tasks";
import { calcInvoiceTotals } from "@/lib/invoice";
import { addMonths, formatYen, startOfMonth, todayJST } from "@/lib/dates";
import { ACTIVE_PROJECT_STATUSES } from "@/lib/status";
import { ProjectStatusBadge } from "@/components/StatusBadge";
import DueDateLabel from "@/components/DueDateLabel";
import TaskCheckbox from "@/components/TaskCheckbox";
import MonthlyChart, { type MonthlyDatum } from "@/components/MonthlyChart";
import Link from "next/link";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "emerald" | "amber";
}) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-700"
      : accent === "amber"
        ? "text-amber-700"
        : "text-slate-800";
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${accentClass}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const today = todayJST();
  const thisMonth = startOfMonth(today);
  const nextMonth = addMonths(thisMonth, 1);
  const sixMonthsAgo = addMonths(thisMonth, -5);

  const [
    paidInvoices,
    sentInvoices,
    issuedThisMonth,
    activeProjectCount,
    todayTasks,
    upcomingProjects,
  ] = await Promise.all([
    // 直近6ヶ月の入金済み請求書（売上集計・グラフ用）
    prisma.invoice.findMany({
      where: { status: "PAID", paidAt: { gte: sixMonthsAgo } },
      include: { items: true },
    }),
    // 未入金（発行済み）
    prisma.invoice.findMany({
      where: { status: "SENT" },
      include: { items: true },
    }),
    // 今月発行した請求書
    prisma.invoice.findMany({
      where: {
        status: { in: ["SENT", "PAID"] },
        issueDate: { gte: thisMonth, lt: nextMonth },
      },
      include: { items: true },
    }),
    prisma.project.count({
      where: { status: { in: ACTIVE_PROJECT_STATUSES } },
    }),
    prisma.task.findMany({
      where: { completed: false, dueDate: { lte: today } },
      include: { project: true },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.project.findMany({
      where: {
        status: { in: ACTIVE_PROJECT_STATUSES },
        dueDate: { not: null },
      },
      include: { client: true },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
  ]);

  const totalOf = (
    invoices: {
      items: { quantity: number; unitPrice: number }[];
      taxRate: number;
    }[]
  ) =>
    invoices.reduce(
      (sum, inv) => sum + calcInvoiceTotals(inv.items, inv.taxRate).total,
      0
    );

  const paidThisMonth = paidInvoices.filter(
    (inv) => inv.paidAt && inv.paidAt >= thisMonth && inv.paidAt < nextMonth
  );

  const monthlyData: MonthlyDatum[] = [];
  for (let i = -5; i <= 0; i++) {
    const mStart = addMonths(thisMonth, i);
    const mEnd = addMonths(thisMonth, i + 1);
    const monthInvoices = paidInvoices.filter(
      (inv) => inv.paidAt && inv.paidAt >= mStart && inv.paidAt < mEnd
    );
    monthlyData.push({
      month: `${mStart.getUTCMonth() + 1}月`,
      amount: totalOf(monthInvoices),
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="今月の売上（入金済み）"
          value={formatYen(totalOf(paidThisMonth))}
          sub={`${paidThisMonth.length}件の入金`}
          accent="emerald"
        />
        <StatCard
          label="今月の請求額"
          value={formatYen(totalOf(issuedThisMonth))}
          sub={`${issuedThisMonth.length}件発行`}
        />
        <StatCard
          label="未入金"
          value={formatYen(totalOf(sentInvoices))}
          sub={`${sentInvoices.length}件`}
          accent="amber"
        />
        <StatCard label="進行中の案件" value={`${activeProjectCount}件`} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="font-bold mb-3">月別売上（入金ベース・直近6ヶ月）</h2>
            <MonthlyChart data={monthlyData} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">期日が近い案件</h2>
              <Link
                href="/projects"
                className="text-sm text-sky-600 hover:underline"
              >
                すべて見る →
              </Link>
            </div>
            <ul className="divide-y divide-gray-100">
              {upcomingProjects.length === 0 && (
                <li className="py-3 text-sm text-gray-400">
                  期日が設定された進行中の案件はありません
                </li>
              )}
              {upcomingProjects.map((p) => (
                <li
                  key={p.id}
                  className="py-2.5 flex items-center gap-3 text-sm"
                >
                  <Link
                    href={`/projects/${p.id}`}
                    className="font-medium text-sky-700 hover:underline flex-1 min-w-0 truncate"
                  >
                    {p.title}
                  </Link>
                  <span className="text-gray-500">{p.client.name}</span>
                  <ProjectStatusBadge status={p.status} />
                  <DueDateLabel dueDate={p.dueDate} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 self-start">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">今日のタスク</h2>
            <Link href="/tasks" className="text-sm text-sky-600 hover:underline">
              すべて見る →
            </Link>
          </div>
          <ul className="space-y-2.5">
            {todayTasks.length === 0 && (
              <li className="text-sm text-gray-400">
                今日のタスクはありません 🎉
              </li>
            )}
            {todayTasks.map((task) => (
              <li key={task.id} className="flex items-start gap-2.5 text-sm">
                <TaskCheckbox
                  checked={task.completed}
                  action={toggleTask.bind(null, task.id)}
                />
                <div className="min-w-0">
                  <p>{task.title}</p>
                  <div className="flex gap-2 text-xs text-gray-400">
                    {task.project && (
                      <Link
                        href={`/projects/${task.project.id}`}
                        className="text-sky-600 hover:underline truncate"
                      >
                        {task.project.title}
                      </Link>
                    )}
                    <DueDateLabel dueDate={task.dueDate} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
