import { prisma } from "@/lib/prisma";
import {
  ACTIVE_PROJECT_STATUSES,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
} from "@/lib/status";
import { formatYen } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import PageHeader from "@/components/PageHeader";
import { ProjectStatusBadge } from "@/components/StatusBadge";
import DueDateLabel from "@/components/DueDateLabel";
import Link from "next/link";
import type { Client, Project } from "@prisma/client";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "active", label: "進行中のみ" },
  { key: "unbilled", label: "未請求" },
  { key: "shortfall", label: "請求不足" },
  { key: "all", label: "すべて" },
  ...PROJECT_STATUSES.map((s) => ({ key: s, label: PROJECT_STATUS_LABELS[s] })),
];

// 請求書の明細を1件も持たない案件（中止した案件は請求しないので除く）
const UNBILLED_WHERE = {
  invoiceItems: { none: {} },
  status: { not: "CANCELLED" },
};

const NO_DUE_DATE_KEY = "unscheduled";

type ProjectWithClient = Project & { client: Client };

function monthKey(date: Date | null): string {
  if (!date) return NO_DUE_DATE_KEY;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  if (key === NO_DUE_DATE_KEY) return "期日未設定";
  const [year, month] = key.split("-");
  return `${year}年${Number(month)}月`;
}

function groupByMonth(
  projects: ProjectWithClient[],
  shortfallOf: (project: ProjectWithClient) => number
) {
  const groups = new Map<string, ProjectWithClient[]>();
  for (const p of projects) {
    const key = monthKey(p.dueDate);
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }
  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    label: monthLabel(key),
    items,
    total: items.reduce((sum, p) => sum + p.amount, 0),
    shortfallTotal: items.reduce((sum, p) => sum + shortfallOf(p), 0),
  }));
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAuth();
  const { status = "active" } = await searchParams;
  const isShortfall = status === "shortfall";
  const where =
    status === "all"
      ? {}
      : status === "unbilled"
        ? UNBILLED_WHERE
        : status === "active"
          ? { status: { in: ACTIVE_PROJECT_STATUSES } }
          : { status };

  const [
    settings,
    invoiceItems,
    billableProjects,
    filteredProjects,
    pendingNoteCounts,
    credentialCounts,
    unbilledCount,
  ] = await Promise.all([
    getSettings(),
    // 案件ごとの請求済み金額を出すための明細（税込）
    prisma.invoiceItem.findMany({
      where: { projectId: { not: null } },
      select: { projectId: true, quantity: true, unitPrice: true },
    }),
    // 「請求不足」の判定対象（受注金額が入っていて中止でない案件）
    prisma.project.findMany({
      where: { status: { not: "CANCELLED" }, amount: { gt: 0 } },
      include: { client: true },
      orderBy: [
        { dueDate: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ],
    }),
    prisma.project.findMany({
      where,
      include: { client: true },
      orderBy: [
        { dueDate: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ],
    }),
    prisma.projectNote.groupBy({
      by: ["projectId"],
      where: { resolved: false },
      _count: { _all: true },
    }),
    prisma.siteCredential.groupBy({
      by: ["projectId"],
      _count: { _all: true },
    }),
    // 「未請求」タブのバッジ用
    prisma.project.count({ where: UNBILLED_WHERE }),
  ]);

  const pendingNotesByProject = new Map(
    pendingNoteCounts.map((row) => [row.projectId, row._count._all])
  );
  const credentialsByProject = new Map(
    credentialCounts.map((row) => [row.projectId, row._count._all])
  );

  // 案件ごとの請求済み金額（税込）。明細の単価はすべて税込で保存している
  const billedByProject = new Map<string, number>();
  for (const item of invoiceItems) {
    if (!item.projectId) continue;
    billedByProject.set(
      item.projectId,
      (billedByProject.get(item.projectId) ?? 0) + item.quantity * item.unitPrice
    );
  }
  const billedOf = (projectId: string) => billedByProject.get(projectId) ?? 0;

  // 受注金額は税別なので、税込に換算して請求済み金額と突き合わせる
  const shortfallOf = (project: { id: string; amount: number }) => {
    const orderedInclusive = Math.round(
      (project.amount * (100 + settings.defaultTaxRate)) / 100
    );
    return Math.max(0, orderedInclusive - billedOf(project.id));
  };

  const shortfallProjects = billableProjects.filter((p) => shortfallOf(p) > 0);
  const projects = isShortfall ? shortfallProjects : filteredProjects;

  const monthGroups = groupByMonth(projects, shortfallOf);

  return (
    <div>
      <PageHeader
        title="案件"
        action={
          <Link
            href="/projects/new"
            className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-medium hover:bg-sky-700"
          >
            + 新規案件
          </Link>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "active" ? "/projects" : `/projects?status=${f.key}`}
            className={`rounded-full px-3 py-1 text-sm border ${
              status === f.key
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {f.label}
            {((f.key === "unbilled" && unbilledCount > 0) ||
              (f.key === "shortfall" && shortfallProjects.length > 0)) && (
              <span
                className={`ml-1.5 tabular-nums ${
                  status === f.key ? "text-white/70" : "text-amber-600"
                }`}
              >
                {f.key === "unbilled" ? unbilledCount : shortfallProjects.length}
              </span>
            )}
          </Link>
        ))}
      </div>

      {isShortfall && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          受注金額（税込換算）に対して、その案件に紐づく請求明細の合計が
          足りていない案件です。着手金だけ請求して残金が未請求のものも含みます。
        </p>
      )}

      {projects.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-8 text-center text-gray-400">
          {isShortfall ? "請求不足の案件はありません 🎉" : "該当する案件はありません"}
        </div>
      )}

      <div className="space-y-6">
        {monthGroups.map((group) => (
          <div
            key={group.key}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="font-bold text-gray-700">
                {group.label}
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {group.items.length}件
                </span>
              </h2>
              <span className="text-sm text-gray-500 tabular-nums">
                受注金額合計 {formatYen(group.total)}
                {isShortfall && (
                  <span className="ml-3 font-medium text-amber-700">
                    不足合計 {formatYen(group.shortfallTotal)}
                  </span>
                )}
              </span>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-gray-400">
                <tr>
                  <th className="px-4 py-2 font-medium">案件名</th>
                  <th className="px-4 py-2 font-medium">顧客</th>
                  <th className="px-4 py-2 font-medium">ステータス</th>
                  <th className="px-4 py-2 font-medium">期日</th>
                  <th className="px-4 py-2 font-medium text-right">受注金額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {group.items.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/projects/${p.id}`}
                        className="font-medium text-sky-700 hover:underline"
                      >
                        {p.title}
                      </Link>
                      {p.recurring && (
                        <span className="ml-1.5 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                          🔁 月額
                        </span>
                      )}
                      {(credentialsByProject.get(p.id) ?? 0) > 0 && (
                        <span
                          title="サイト情報あり"
                          className="ml-1.5 inline-block text-xs"
                        >
                          🔑
                        </span>
                      )}
                      {(pendingNotesByProject.get(p.id) ?? 0) > 0 && (
                        <span className="ml-1.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          💬 確認 {pendingNotesByProject.get(p.id)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.client.name}</td>
                    <td className="px-4 py-3">
                      <ProjectStatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      <DueDateLabel
                        dueDate={p.dueDate}
                        done={p.status === "COMPLETED" || p.status === "CANCELLED"}
                      />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatYen(p.amount)}
                      {isShortfall && (
                        <>
                          <span className="mt-0.5 block text-xs text-gray-400">
                            請求済み {formatYen(billedOf(p.id))}
                          </span>
                          <span className="block text-xs font-medium text-amber-600">
                            不足 {formatYen(shortfallOf(p))}（税込）
                          </span>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
