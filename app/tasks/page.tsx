import { prisma } from "@/lib/prisma";
import { todayJST, toDateInputValue } from "@/lib/dates";
import PageHeader from "@/components/PageHeader";
import TaskBoard, {
  type ProjectOption,
  type TaskDto,
} from "@/components/tasks/TaskBoard";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const today = todayJST();
  const [projects, allTasks] = await Promise.all([
    prisma.project.findMany({
      where: { status: { in: ["LEAD", "IN_PROGRESS", "REVIEW", "DELIVERED"] } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.findMany({
      include: { project: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const toDto = (t: (typeof allTasks)[number]): TaskDto => ({
    id: t.id,
    title: t.title,
    dueDate: t.dueDate ? toDateInputValue(t.dueDate) : null,
    completed: t.completed,
    priority: t.priority,
    projectId: t.projectId,
    projectTitle: t.project?.title ?? null,
  });

  const tasks = allTasks.filter((t) => !t.completed).map(toDto);
  const completedTasks = allTasks
    .filter((t) => t.completed)
    .slice(-20)
    .reverse()
    .map(toDto);

  const projectOptions: ProjectOption[] = projects.map((p) => ({
    id: p.id,
    title: p.title,
  }));

  return (
    <div>
      <PageHeader title="タスク" />
      <TaskBoard
        tasks={tasks}
        completedTasks={completedTasks}
        projects={projectOptions}
        todayStr={toDateInputValue(today)}
      />
    </div>
  );
}
