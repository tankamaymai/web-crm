import { prisma } from "@/lib/prisma";
import { deleteProject } from "@/app/actions/projects";
import { createInvoiceFromProject } from "@/app/actions/invoices";
import { calcInvoiceTotals } from "@/lib/invoice";
import { toggleTask, deleteTask, createTask } from "@/app/actions/tasks";
import { formatDate, formatYen } from "@/lib/dates";
import PageHeader from "@/components/PageHeader";
import { InvoiceStatusBadge, ProjectStatusBadge } from "@/components/StatusBadge";
import DueDateLabel from "@/components/DueDateLabel";
import DeleteButton from "@/components/DeleteButton";
import TaskCheckbox from "@/components/TaskCheckbox";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      tasks: { orderBy: [{ completed: "asc" }, { dueDate: "asc" }] },
      invoices: { orderBy: { issueDate: "desc" }, include: { items: true } },
    },
  });
  if (!project) notFound();

  return (
    <div>
      <PageHeader
        title={project.title}
        action={
          <div className="flex flex-wrap gap-3 items-center">
            <form action={createInvoiceFromProject.bind(null, project.id)}>
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
              >
                🧾 請求書を発行
              </button>
            </form>
            <Link
              href={`/projects/${project.id}/edit`}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              編集
            </Link>
            <DeleteButton
              action={deleteProject.bind(null, project.id)}
              confirmMessage={`「${project.title}」を削除しますか？`}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">顧客</dt>
                <dd className="mt-0.5 font-medium">
                  {project.client.name}
                  {project.client.company && (
                    <span className="text-gray-500 font-normal">
                      （{project.client.company}）
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">ステータス</dt>
                <dd className="mt-0.5">
                  <ProjectStatusBadge status={project.status} />
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">開始日</dt>
                <dd className="mt-0.5">{formatDate(project.startDate)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">期日（納期）</dt>
                <dd className="mt-0.5">
                  <DueDateLabel
                    dueDate={project.dueDate}
                    done={
                      project.status === "COMPLETED" ||
                      project.status === "CANCELLED"
                    }
                  />
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">
                  受注金額（税別）
                  {project.recurring && (
                    <span className="ml-1.5 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                      🔁 月額
                    </span>
                  )}
                </dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {formatYen(project.amount)}
                  {project.recurring && (
                    <span className="ml-1 text-xs font-normal text-gray-400">
                      / 月
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">サイトURL</dt>
                <dd className="mt-0.5">
                  {project.siteUrl ? (
                    <a
                      href={project.siteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 hover:underline break-all"
                    >
                      {project.siteUrl}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              {project.description && (
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">案件内容</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap">
                    {project.description}
                  </dd>
                </div>
              )}
              {project.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">メモ</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap">{project.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold mb-4">タスク</h2>
            <ul className="space-y-2 mb-4">
              {project.tasks.length === 0 && (
                <li className="text-sm text-gray-400">タスクはありません</li>
              )}
              {project.tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 text-sm">
                  <TaskCheckbox
                    checked={task.completed}
                    action={toggleTask.bind(null, task.id)}
                  />
                  <span
                    className={
                      task.completed ? "line-through text-gray-400" : ""
                    }
                  >
                    {task.title}
                  </span>
                  <span className="ml-auto">
                    <DueDateLabel dueDate={task.dueDate} done={task.completed} />
                  </span>
                  <DeleteButton
                    action={deleteTask.bind(null, task.id)}
                    label="✕"
                    confirmMessage="このタスクを削除しますか？"
                    className="text-gray-400 hover:text-red-500"
                  />
                </li>
              ))}
            </ul>
            <form action={createTask} className="flex flex-wrap gap-2">
              <input type="hidden" name="projectId" value={project.id} />
              <input
                name="title"
                required
                placeholder="タスクを追加..."
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                name="dueDate"
                type="date"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold mb-4">この案件の請求書</h2>
            <ul className="space-y-3">
              {project.invoices.length === 0 && (
                <li className="text-sm text-gray-400">
                  まだ請求書はありません。「請求書を発行」で作成できます。
                </li>
              )}
              {project.invoices.map((inv) => {
                const { total } = calcInvoiceTotals(
                  inv.items,
                  inv.taxRate,
                  inv.taxMode,
                  inv.issueDate
                );
                return (
                  <li key={inv.id} className="text-sm">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="text-sky-700 hover:underline font-medium"
                    >
                      {inv.invoiceNumber}
                    </Link>
                    <div className="flex items-center justify-between mt-0.5 text-gray-500">
                      <span>{formatDate(inv.issueDate)}</span>
                      <span className="tabular-nums">{formatYen(total)}</span>
                      <InvoiceStatusBadge status={inv.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
