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

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "active", label: "進行中のみ" },
  { key: "all", label: "すべて" },
  ...PROJECT_STATUSES.map((s) => ({ key: s, label: PROJECT_STATUS_LABELS[s] })),
];

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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">案件名</th>
              <th className="px-4 py-3 font-medium">顧客</th>
              <th className="px-4 py-3 font-medium">ステータス</th>
              <th className="px-4 py-3 font-medium">期日</th>
              <th className="px-4 py-3 font-medium text-right">受注金額</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  該当する案件はありません
                </td>
              </tr>
            )}
            {projects.map((p) => (
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
    </div>
  );
}
