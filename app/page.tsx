import { prisma } from "@/lib/prisma";
import { toggleTask } from "@/app/actions/tasks";
import { calcInvoiceTotals } from "@/lib/invoice";
import { getSettings } from "@/lib/settings";
import { addMonths, formatYen, startOfMonth, todayJST } from "@/lib/dates";
import { ACTIVE_PROJECT_STATUSES } from "@/lib/status";
import { ProjectStatusBadge } from "@/components/StatusBadge";
import DueDateLabel from "@/components/DueDateLabel";
import TaskCheckbox from "@/components/TaskCheckbox";
import MonthlyChart, {
  type MonthlyDatum,
  type SalesSeries,
} from "@/components/MonthlyChart";
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

function PipelineStage({
  label,
  value,
  sub,
  barClass,
}: {
  label: string;
  value: string;
  sub: string;
  barClass: string;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
      <div className={`h-1.5 rounded-full ${barClass} mb-2`} />
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-800">
        {value}
      </p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const today = todayJST();
  const thisMonth = startOfMonth(today);
  const nextMonth = addMonths(thisMonth, 1);
  const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  const nextYearStart = new Date(Date.UTC(today.getUTCFullYear() + 1, 0, 1));

  const [
    settings,
    salesInvoices,
    activeProjectCount,
    leadProjects,
    activeUnbilledProjects,
    todayTasks,
    upcomingProjects,
  ] = await Promise.all([
    getSettings(),
    // 売上請求書 = 発行済み(SENT) + 入金済み(PAID)。発行日基準で集計する。
    // 累計売上の計算に全期間が必要（個人利用の件数規模のため全件取得でOK）
    prisma.invoice.findMany({
      where: { status: { in: ["SENT", "PAID"] } },
      include: { items: true, project: { select: { title: true } } },
    }),
    prisma.project.count({
      where: { status: { in: ACTIVE_PROJECT_STATUSES } },
    }),
    // 見込み案件（未請求）: 請求書を1件も持たない LEAD 案件
    prisma.project.findMany({
      where: { status: "LEAD", invoices: { none: {} } },
      select: { amount: true },
    }),
    // 進行中案件（未請求）: 請求書を1件も持たない進行中系案件
    prisma.project.findMany({
      where: {
        status: { in: ["IN_PROGRESS", "REVIEW", "DELIVERED"] },
        invoices: { none: {} },
      },
      select: { amount: true },
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
  const paidInvoices = salesInvoices.filter((inv) => inv.status === "PAID");

  // 売上パイプライン（すべて税込に揃える）。案件は税別なので税込換算する。
  const toInclusive = (amountExcl: number) =>
    Math.round((amountExcl * (100 + settings.defaultTaxRate)) / 100);
  const sumProjectsInclusive = (projects: { amount: number }[]) =>
    projects.reduce((s, p) => s + toInclusive(p.amount), 0);

  const leadTotal = sumProjectsInclusive(leadProjects);
  const activeUnbilledTotal = sumProjectsInclusive(activeUnbilledProjects);
  const unpaidTotal = totalOf(unpaidInvoices);
  const paidTotal = totalOf(paidInvoices);
  const pipelineTotal = leadTotal + activeUnbilledTotal + unpaidTotal + paidTotal;

  // 直近12ヶ月の月別売上（発行日基準）。案件ごとに積み上げる。
  const OTHER_LABEL = "その他";
  const CHART_COLORS = [
    "#2a78d6",
    "#1baf7a",
    "#eda100",
    "#008300",
    "#4a3aa7",
    "#e34948",
    "#e87ba4",
    "#eb6834",
  ];
  const MAX_SERIES = 7; // 8色目以降は「その他」に畳む

  const months = Array.from({ length: 12 }, (_, i) => {
    const mStart = addMonths(thisMonth, i - 11);
    return {
      start: mStart,
      end: addMonths(thisMonth, i - 10),
      label: `${mStart.getUTCFullYear() % 100}/${mStart.getUTCMonth() + 1}`,
    };
  });

  // 案件タイトル × 月 の売上合計を作る
  const byProject = new Map<string, number[]>();
  for (const inv of salesInvoices) {
    const monthIndex = months.findIndex(
      (m) => inv.issueDate >= m.start && inv.issueDate < m.end
    );
    if (monthIndex < 0) continue;
    const label = inv.project?.title ?? OTHER_LABEL;
    const arr = byProject.get(label) ?? new Array(12).fill(0);
    arr[monthIndex] += calcInvoiceTotals(
      inv.items,
      inv.taxRate,
      inv.taxMode,
      inv.issueDate
    ).total;
    byProject.set(label, arr);
  }

  // 合計金額の大きい案件から色を割り当て、あふれた分は「その他」へ
  const ranked = [...byProject.entries()]
    .map(([label, arr]) => ({ label, arr, sum: arr.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.sum - a.sum);
  const topProjects = ranked
    .filter((r) => r.label !== OTHER_LABEL)
    .slice(0, MAX_SERIES);
  const folded = ranked.filter(
    (r) => r.label === OTHER_LABEL || !topProjects.includes(r)
  );
  const otherArr = new Array(12).fill(0);
  for (const r of folded) {
    for (let i = 0; i < 12; i++) otherArr[i] += r.arr[i];
  }

  const chartSeries: SalesSeries[] = [
    ...topProjects.map((r, i) => ({
      key: `p${i}`,
      label: r.label,
      color: CHART_COLORS[i],
    })),
    ...(otherArr.some((v) => v > 0)
      ? [{ key: "other", label: OTHER_LABEL, color: "#94a3b8" }]
      : []),
  ];

  const monthlyData: MonthlyDatum[] = months.map((m, monthIndex) => {
    const row: MonthlyDatum = { month: m.label };
    topProjects.forEach((r, i) => {
      row[`p${i}`] = r.arr[monthIndex];
    });
    if (otherArr.some((v) => v > 0)) row.other = otherArr[monthIndex];
    return row;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>

      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-3">
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
      </div>

      {/* 売上パイプライン: 見込み→進行中→請求済み→入金済み（すべて税込） */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="font-bold">売上パイプライン</h2>
          <div className="sm:text-right">
            <span className="text-sm text-gray-500 mr-2">着地見込み合計</span>
            <span className="text-2xl font-bold tabular-nums text-slate-800">
              {formatYen(pipelineTotal)}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PipelineStage
            label="見込み"
            value={formatYen(leadTotal)}
            sub={`${leadProjects.length}件`}
            barClass="bg-gray-300"
          />
          <PipelineStage
            label="進行中（未請求）"
            value={formatYen(activeUnbilledTotal)}
            sub={`${activeUnbilledProjects.length}件`}
            barClass="bg-blue-400"
          />
          <PipelineStage
            label="請求済み・未入金"
            value={formatYen(unpaidTotal)}
            sub={`${unpaidInvoices.length}件`}
            barClass="bg-amber-400"
          />
          <PipelineStage
            label="入金済み"
            value={formatYen(paidTotal)}
            sub={`${paidInvoices.length}件`}
            barClass="bg-emerald-500"
          />
        </div>
        <p className="mt-3 text-xs text-gray-400">
          将来（見込み・進行中）はすべてやり切った場合の税込金額です。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="font-bold mb-3">月別売上（発行ベース・直近12ヶ月）</h2>
            <MonthlyChart data={monthlyData} series={chartSeries} />
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
                  className="py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
                >
                  <Link
                    href={`/projects/${p.id}`}
                    className="font-medium text-sky-700 hover:underline min-w-0 basis-full truncate sm:basis-auto sm:flex-1"
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
