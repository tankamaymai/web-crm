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
  const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  const nextYearStart = new Date(Date.UTC(today.getUTCFullYear() + 1, 0, 1));

  const [salesInvoices, activeProjectCount, todayTasks, upcomingProjects] =
    await Promise.all([
      // 売上請求書 = 発行済み(SENT) + 入金済み(PAID)。発行日基準で集計する。
      // 累計売上の計算に全期間が必要（個人利用の件数規模のため全件取得でOK）
      prisma.invoice.findMany({
        where: { status: { in: ["SENT", "PAID"] } },
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
      taxMode: string;
      issueDate: Date;
    }[]
  ) =>
    invoices.reduce(
      (sum, inv) =>
        sum +
        calcInvoiceTotals(inv.items, inv.taxRate, inv.taxMode, inv.issueDate)
          .total,
      0
    );

  const issuedThisMonth = salesInvoices.filter(
    (inv) => inv.issueDate >= thisMonth && inv.issueDate < nextMonth
  );
  const issuedThisYear = salesInvoices.filter(
    (inv) => inv.issueDate >= yearStart && inv.issueDate < nextYearStart
  );
  const unpaidInvoices = salesInvoices.filter((inv) => inv.status === "SENT");

  // 直近12ヶ月の月別売上（発行日基準）
  const monthlyData: MonthlyDatum[] = [];
  for (let i = -11; i <= 0; i++) {
    const mStart = addMonths(thisMonth, i);
    const mEnd = addMonths(thisMonth, i + 1);
    const monthInvoices = salesInvoices.filter(
      (inv) => inv.issueDate >= mStart && inv.issueDate < mEnd
    );
    monthlyData.push({
      month: `${mStart.getUTCFullYear() % 100}/${mStart.getUTCMonth() + 1}`,
      amount: totalOf(monthInvoices),
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="今月の売上"
          value={formatYen(totalOf(issuedThisMonth))}
          sub={`${issuedThisMonth.length}件発行（発行ベース）`}
          accent="emerald"
        />
        <StatCard
          label={`今年の売上（${today.getUTCFullYear()}年）`}
          value={formatYen(totalOf(issuedThisYear))}
          sub={`${issuedThisYear.length}件発行`}
        />
        <StatCard
          label="累計売上（全期間）"
          value={formatYen(totalOf(salesInvoices))}
          sub={`${salesInvoices.length}件発行`}
        />
        <StatCard
          label="未入金"
          value={formatYen(totalOf(unpaidInvoices))}
          sub={`${unpaidInvoices.length}件`}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="font-bold mb-3">月別売上（発行ベース・直近12ヶ月）</h2>
            <MonthlyChart data={monthlyData} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h2 className="font-bold">期日が近い案件</h2>
                <span className="text-xs rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5">
                  進行中 {activeProjectCount}件
                </span>
              </div>
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
