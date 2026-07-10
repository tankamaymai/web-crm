import { prisma } from "@/lib/prisma";
import {
  ACTIVE_PROJECT_STATUSES,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
} from "@/lib/status";
import { formatYen } from "@/lib/dates";
import PageHeader from "@/components/PageHeader";
import { ProjectStatusBadge } from "@/components/StatusBadge";
import DueDateLabel from "@/components/DueDateLabel";
import Link from "next/link";
import type { Client, Project } from "@prisma/client";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "active", label: "進行中のみ" },
  { key: "all", label: "すべて" },
  ...PROJECT_STATUSES.map((s) => ({ key: s, label: PROJECT_STATUS_LABELS[s] })),
];

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

function groupByMonth(projects: ProjectWithClient[]) {
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
  }));
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "active" } = await searchParams;
  const where =
    status === "all"
      ? {}
      : status === "active"
        ? { status: { in: ACTIVE_PROJECT_STATUSES } }
        : { status };

  const projects = await prisma.project.findMany({
    where,
    include: { client: true },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  });

  const monthGroups = groupByMonth(projects);

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
          </Link>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-8 text-center text-gray-400">
          該当する案件はありません
        </div>
      )}

      <div className="space-y-6">
        {monthGroups.map((group) => (
          <div
            key={group.key}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="flex items-baseline justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="font-bold text-gray-700">
                {group.label}
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {group.items.length}件
                </span>
              </h2>
              <span className="text-sm text-gray-500 tabular-nums">
                受注金額合計 {formatYen(group.total)}
              </span>
            </div>
            <table className="w-full text-sm">
              <thead className="text-gray-500 text-left">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
