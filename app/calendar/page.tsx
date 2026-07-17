import { prisma } from "@/lib/prisma";
import { formatMonth, todayJST } from "@/lib/dates";
import { PROJECT_STATUS_LABELS } from "@/lib/status";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function monthParam(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const today = todayJST();
  const current =
    month && /^\d{4}-\d{2}$/.test(month)
      ? new Date(`${month}-01`)
      : new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  const prev = new Date(
    Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 1, 1)
  );
  const next = new Date(
    Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1)
  );

  // カレンダーのグリッド範囲（月初の週の日曜〜月末の週の土曜）
  const gridStart = new Date(current);
  gridStart.setUTCDate(1 - gridStart.getUTCDay());
  const monthEnd = new Date(
    Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0)
  );
  const gridEnd = new Date(monthEnd);
  gridEnd.setUTCDate(monthEnd.getUTCDate() + (6 - monthEnd.getUTCDay()));

  const [projects, tasks] = await Promise.all([
    prisma.project.findMany({
      where: { dueDate: { gte: gridStart, lte: gridEnd } },
      include: { client: true },
    }),
    prisma.task.findMany({
      where: { dueDate: { gte: gridStart, lte: gridEnd } },
      include: { project: true },
    }),
  ]);

  const days: Date[] = [];
  for (
    let d = new Date(gridStart);
    d <= gridEnd;
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
  ) {
    days.push(d);
  }

  const keyOf = (d: Date) => d.toISOString().slice(0, 10);
  const projectsByDay = new Map<string, typeof projects>();
  for (const p of projects) {
    if (!p.dueDate) continue;
    const k = keyOf(p.dueDate);
    projectsByDay.set(k, [...(projectsByDay.get(k) ?? []), p]);
  }
  const tasksByDay = new Map<string, typeof tasks>();
  for (const t of tasks) {
    if (!t.dueDate) continue;
    const k = keyOf(t.dueDate);
    tasksByDay.set(k, [...(tasksByDay.get(k) ?? []), t]);
  }

  return (
    <div>
      <PageHeader
        title="カレンダー"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/calendar?month=${monthParam(prev)}`}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              ← 前月
            </Link>
            <Link
              href="/calendar"
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              今月
            </Link>
            <Link
              href={`/calendar?month=${monthParam(next)}`}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              翌月 →
            </Link>
          </div>
        }
      />

      <h2 className="text-lg font-bold mb-4">{formatMonth(current)}</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <div className="min-w-[700px]">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center text-xs text-gray-500">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`py-2 font-medium ${
                i === 0 ? "text-red-500" : i === 6 ? "text-sky-500" : ""
              }`}
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const k = keyOf(day);
            const inMonth = day.getUTCMonth() === current.getUTCMonth();
            const isToday = day.getTime() === today.getTime();
            const dayProjects = projectsByDay.get(k) ?? [];
            const dayTasks = tasksByDay.get(k) ?? [];
            return (
              <div
                key={k}
                className={`min-h-28 border-b border-r border-gray-100 p-1.5 text-xs ${
                  inMonth ? "" : "bg-gray-50/70 text-gray-400"
                }`}
              >
                <div
                  className={`mb-1 inline-flex size-6 items-center justify-center rounded-full ${
                    isToday ? "bg-sky-600 text-white font-bold" : ""
                  }`}
                >
                  {day.getUTCDate()}
                </div>
                <div className="space-y-1">
                  {dayProjects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      title={`${p.title}（${p.client.name} / ${PROJECT_STATUS_LABELS[p.status]}）`}
                      className="block truncate rounded bg-violet-100 px-1.5 py-0.5 text-violet-800 hover:bg-violet-200"
                    >
                      📁 {p.title}
                    </Link>
                  ))}
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      title={t.project ? `${t.title}（${t.project.title}）` : t.title}
                      className={`truncate rounded px-1.5 py-0.5 ${
                        t.completed
                          ? "bg-gray-100 text-gray-400 line-through"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      ✓ {t.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        📁 = 案件の期日 / ✓ = タスク
      </p>
    </div>
  );
}
