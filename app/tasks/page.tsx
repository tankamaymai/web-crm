import { prisma } from "@/lib/prisma";
import { createTask, deleteTask, toggleTask } from "@/app/actions/tasks";
import { todayJST, toDateInputValue } from "@/lib/dates";
import PageHeader from "@/components/PageHeader";
import DueDateLabel from "@/components/DueDateLabel";
import TaskCheckbox from "@/components/TaskCheckbox";
import DeleteButton from "@/components/DeleteButton";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type TaskWithProject = Prisma.TaskGetPayload<{ include: { project: true } }>;

function TaskList({
  tasks,
  emptyText,
}: {
  tasks: TaskWithProject[];
  emptyText: string;
}) {
  if (tasks.length === 0)
    return <p className="text-sm text-gray-400 px-1">{emptyText}</p>;
  return (
    <ul className="divide-y divide-gray-100 bg-white rounded-xl shadow-sm border border-gray-200">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-center gap-3 px-4 py-3 text-sm">
          <TaskCheckbox
            checked={task.completed}
            action={toggleTask.bind(null, task.id)}
          />
          <div className="flex-1 min-w-0">
            <span className={task.completed ? "line-through text-gray-400" : ""}>
              {task.title}
            </span>
            {task.project && (
              <Link
                href={`/projects/${task.project.id}`}
                className="ml-2 text-xs text-sky-600 hover:underline"
              >
                {task.project.title}
              </Link>
            )}
          </div>
          <DueDateLabel dueDate={task.dueDate} done={task.completed} />
          <DeleteButton
            action={deleteTask.bind(null, task.id)}
            label="✕"
            confirmMessage="このタスクを削除しますか？"
            className="text-gray-400 hover:text-red-500"
          />
        </li>
      ))}
    </ul>
  );
}

export default async function TasksPage() {
  const today = todayJST();
  const [projects, allTasks] = await Promise.all([
    prisma.project.findMany({
      where: { status: { in: ["LEAD", "IN_PROGRESS", "REVIEW", "DELIVERED"] } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.findMany({
      include: { project: true },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const overdue = allTasks.filter(
    (t) => !t.completed && t.dueDate && t.dueDate < today
  );
  const todayTasks = allTasks.filter(
    (t) =>
      (!t.completed &&
        t.dueDate &&
        t.dueDate.getTime() === today.getTime()) ||
      (t.completed && t.dueDate && t.dueDate.getTime() === today.getTime())
  );
  const upcoming = allTasks.filter(
    (t) => !t.completed && (!t.dueDate || t.dueDate > today)
  );
  const doneRecent = allTasks
    .filter(
      (t) => t.completed && (!t.dueDate || t.dueDate.getTime() !== today.getTime())
    )
    .slice(-10)
    .reverse();

  return (
    <div>
      <PageHeader title="タスク" />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8 max-w-3xl">
        <form action={createTask} className="flex gap-2">
          <input
            name="title"
            required
            placeholder="新しいタスク..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            name="projectId"
            defaultValue=""
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm max-w-48"
          >
            <option value="">案件なし</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <input
            name="dueDate"
            type="date"
            defaultValue={toDateInputValue(today)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-medium hover:bg-sky-700"
          >
            追加
          </button>
        </form>
      </div>

      <div className="space-y-8 max-w-3xl">
        {overdue.length > 0 && (
          <section>
            <h2 className="font-bold text-red-600 mb-3">期日超過</h2>
            <TaskList tasks={overdue} emptyText="" />
          </section>
        )}
        <section>
          <h2 className="font-bold mb-3">今日のタスク</h2>
          <TaskList tasks={todayTasks} emptyText="今日のタスクはありません 🎉" />
        </section>
        <section>
          <h2 className="font-bold mb-3">今後のタスク</h2>
          <TaskList tasks={upcoming} emptyText="予定されたタスクはありません" />
        </section>
        {doneRecent.length > 0 && (
          <section>
            <h2 className="font-bold text-gray-500 mb-3">完了済み（直近）</h2>
            <TaskList tasks={doneRecent} emptyText="" />
          </section>
        )}
      </div>
    </div>
  );
}
