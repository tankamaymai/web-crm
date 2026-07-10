"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createTask,
  deleteTask,
  reorderTasks,
  toggleTask,
  updateTask,
} from "@/app/actions/tasks";

export type TaskDto = {
  id: string;
  title: string;
  dueDate: string | null; // "YYYY-MM-DD"
  completed: boolean;
  priority: number;
  projectId: string | null;
  projectTitle: string | null;
};

export type ProjectOption = { id: string; title: string };

type SectionKey = "overdue" | "today" | "tomorrow" | "upcoming" | "nodate";

const SECTION_ORDER: SectionKey[] = [
  "overdue",
  "today",
  "tomorrow",
  "upcoming",
  "nodate",
];

const SECTION_LABELS: Record<SectionKey, string> = {
  overdue: "期日超過",
  today: "今日",
  tomorrow: "明日",
  upcoming: "今後",
  nodate: "期日なし",
};

// Todoistのp1〜p4に相当する優先度カラー
const PRIORITY_RING: Record<number, string> = {
  1: "border-red-500 hover:bg-red-50",
  2: "border-amber-500 hover:bg-amber-50",
  3: "border-blue-500 hover:bg-blue-50",
  4: "border-gray-300 hover:bg-gray-100",
};

const PRIORITY_FLAG: Record<number, string> = {
  1: "text-red-500",
  2: "text-amber-500",
  3: "text-blue-500",
  4: "text-gray-300",
};

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function groupTasks(tasks: TaskDto[], todayStr: string) {
  const tomorrowStr = addDaysStr(todayStr, 1);
  const columns: Record<SectionKey, TaskDto[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    upcoming: [],
    nodate: [],
  };
  for (const t of tasks) {
    if (!t.dueDate) columns.nodate.push(t);
    else if (t.dueDate < todayStr) columns.overdue.push(t);
    else if (t.dueDate === todayStr) columns.today.push(t);
    else if (t.dueDate === tomorrowStr) columns.tomorrow.push(t);
    else columns.upcoming.push(t);
  }
  return columns;
}

/** セクションへドロップしたときに設定する期日 */
function dueDateForSection(
  section: SectionKey,
  task: TaskDto,
  todayStr: string
): string | null {
  const tomorrowStr = addDaysStr(todayStr, 1);
  switch (section) {
    case "today":
      return todayStr;
    case "tomorrow":
      return tomorrowStr;
    case "upcoming":
      // すでに明日より先の期日ならそのまま、それ以外は1週間後
      return task.dueDate && task.dueDate > tomorrowStr
        ? task.dueDate
        : addDaysStr(todayStr, 7);
    case "nodate":
      return null;
    case "overdue":
      return task.dueDate;
  }
}

function TaskRow({
  task,
  todayStr,
  onToggle,
  onDelete,
  onUpdate,
  dragging,
}: {
  task: TaskDto;
  todayStr: string;
  onToggle: (task: TaskDto) => void;
  onDelete: (task: TaskDto) => void;
  onUpdate: (
    task: TaskDto,
    data: { title?: string; dueDate?: string | null; priority?: number }
  ) => void;
  dragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");

  // サーバー側の値が変わったらrender中に同期する（派生ステート）
  const [prevKey, setPrevKey] = useState(`${task.title}|${task.dueDate}`);
  const currentKey = `${task.title}|${task.dueDate}`;
  if (prevKey !== currentKey) {
    setPrevKey(currentKey);
    setTitle(task.title);
    setDueDate(task.dueDate ?? "");
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const overdue = task.dueDate && task.dueDate < todayStr;

  if (editing) {
    return (
      <li
        ref={setNodeRef}
        style={style}
        className="rounded-lg border border-sky-300 bg-white p-3 space-y-2"
      >
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onUpdate(task, { title, dueDate: dueDate || null });
              setEditing(false);
            }
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-xs"
          />
          <select
            value={task.priority}
            onChange={(e) => onUpdate(task, { priority: Number(e.target.value) })}
            className="rounded border border-gray-300 px-2 py-1 text-xs"
          >
            {[1, 2, 3, 4].map((p) => (
              <option key={p} value={p}>
                優先度{p}
              </option>
            ))}
          </select>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdate(task, { title, dueDate: dueDate || null });
                setEditing(false);
              }}
              className="rounded bg-sky-600 px-3 py-1 text-xs text-white hover:bg-sky-700"
            >
              保存
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 rounded-lg border bg-white px-2 py-2 ${
        dragging ? "shadow-lg border-sky-300" : "border-gray-100 hover:border-gray-200"
      }`}
    >
      {/* ドラッグハンドル */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none px-0.5 text-gray-300 opacity-0 group-hover:opacity-100 active:cursor-grabbing"
        aria-label="ドラッグして並べ替え"
      >
        ⠿
      </button>

      {/* 優先度カラーの完了チェック */}
      <button
        type="button"
        onClick={() => onToggle(task)}
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 text-transparent transition hover:text-gray-400 ${PRIORITY_RING[task.priority] ?? PRIORITY_RING[4]}`}
        aria-label="完了にする"
      >
        <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <button
        type="button"
        onDoubleClick={() => setEditing(true)}
        onClick={() => setEditing(true)}
        className="min-w-0 flex-1 truncate text-left text-sm"
        title={task.title}
      >
        {task.title}
      </button>

      {task.projectId && task.projectTitle && (
        <Link
          href={`/projects/${task.projectId}`}
          className="hidden max-w-32 truncate rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 hover:text-sky-600 sm:block"
        >
          {task.projectTitle}
        </Link>
      )}

      {task.dueDate && (
        <span
          className={`text-xs tabular-nums ${overdue ? "text-red-500 font-medium" : "text-gray-400"}`}
        >
          {formatShortDate(task.dueDate)}
        </span>
      )}

      {/* 優先度フラグ（クリックで巡回） */}
      <button
        type="button"
        onClick={() =>
          onUpdate(task, { priority: task.priority === 1 ? 4 : task.priority - 1 })
        }
        className={`px-0.5 text-sm opacity-0 group-hover:opacity-100 ${task.priority < 4 ? "opacity-100" : ""} ${PRIORITY_FLAG[task.priority] ?? PRIORITY_FLAG[4]}`}
        title={`優先度${task.priority}（クリックで変更）`}
      >
        ⚑
      </button>

      <button
        type="button"
        onClick={() => onDelete(task)}
        className="px-0.5 text-gray-300 opacity-0 hover:text-red-500 group-hover:opacity-100"
        aria-label="削除"
      >
        ✕
      </button>
    </li>
  );
}

function QuickAdd({
  section,
  todayStr,
  projects,
  onAdded,
}: {
  section: SectionKey;
  todayStr: string;
  projects: ProjectOption[];
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState(4);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-400 hover:text-red-500"
      >
        <span className="text-lg leading-none">+</span> タスクを追加
      </button>
    );
  }

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed || pending) return;
    const fd = new FormData();
    fd.set("title", trimmed);
    fd.set("projectId", projectId);
    fd.set("priority", String(priority));
    const due =
      section === "nodate"
        ? "none"
        : section === "tomorrow"
          ? addDaysStr(todayStr, 1)
          : section === "upcoming"
            ? addDaysStr(todayStr, 7)
            : todayStr;
    fd.set("dueDate", due);
    startTransition(async () => {
      await createTask(fd);
      setTitle("");
      onAdded();
    });
  };

  return (
    <div className="mt-1 rounded-lg border border-gray-200 bg-white p-3 space-y-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="タスク名を入力してEnter"
        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-xs max-w-44"
        >
          <option value="">案件なし</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
        >
          {[1, 2, 3, 4].map((p) => (
            <option key={p} value={p}>
              優先度{p}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
          >
            閉じる
          </button>
          <button
            type="button"
            disabled={pending || !title.trim()}
            onClick={submit}
            className="rounded bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-40"
          >
            {pending ? "追加中..." : "タスクを追加"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  section,
  tasks,
  todayStr,
  projects,
  onToggle,
  onDelete,
  onUpdate,
  onAdded,
}: {
  section: SectionKey;
  tasks: TaskDto[];
  todayStr: string;
  projects: ProjectOption[];
  onToggle: (task: TaskDto) => void;
  onDelete: (task: TaskDto) => void;
  onUpdate: (
    task: TaskDto,
    data: { title?: string; dueDate?: string | null; priority?: number }
  ) => void;
  onAdded: () => void;
}) {
  const { setNodeRef } = useDroppable({ id: section });

  if (section === "overdue" && tasks.length === 0) return null;

  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2 border-b border-gray-200 pb-1">
        <h2
          className={`text-sm font-bold ${section === "overdue" ? "text-red-600" : "text-gray-700"}`}
        >
          {SECTION_LABELS[section]}
        </h2>
        <span className="text-xs text-gray-400">{tasks.length}</span>
      </div>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul ref={setNodeRef} className="min-h-2 space-y-1">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              todayStr={todayStr}
              onToggle={onToggle}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))}
        </ul>
      </SortableContext>
      {section !== "overdue" && (
        <QuickAdd
          section={section}
          todayStr={todayStr}
          projects={projects}
          onAdded={onAdded}
        />
      )}
    </section>
  );
}

export default function TaskBoard({
  tasks,
  completedTasks,
  projects,
  todayStr,
}: {
  tasks: TaskDto[];
  completedTasks: TaskDto[];
  projects: ProjectOption[];
  todayStr: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [columns, setColumns] = useState(() => groupTasks(tasks, todayStr));
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // サーバーから新しいタスク一覧が来たらrender中に同期する（派生ステート）
  const [prevTasks, setPrevTasks] = useState(tasks);
  if (prevTasks !== tasks) {
    setPrevTasks(tasks);
    setColumns(groupTasks(tasks, todayStr));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeTask = useMemo(() => {
    if (!activeId) return null;
    for (const key of SECTION_ORDER) {
      const found = columns[key].find((t) => t.id === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, columns]);

  const findContainer = (id: UniqueIdentifier): SectionKey | null => {
    if (SECTION_ORDER.includes(id as SectionKey)) return id as SectionKey;
    for (const key of SECTION_ORDER) {
      if (columns[key].some((t) => t.id === id)) return key;
    }
    return null;
  };

  const persist = (cols: Record<SectionKey, TaskDto[]>) => {
    const updates: { id: string; sortOrder: number; dueDate: string | null }[] =
      [];
    let order = 0;
    for (const key of SECTION_ORDER) {
      for (const task of cols[key]) {
        updates.push({
          id: task.id,
          sortOrder: order++,
          dueDate: dueDateForSection(key, task, todayStr),
        });
      }
    }
    startTransition(async () => {
      await reorderTasks(updates);
      router.refresh();
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const from = findContainer(active.id);
    const to = findContainer(over.id);
    // 期日超過セクションへのドロップは不可（過去日付を作らない）
    if (!from || !to || from === to || to === "overdue") return;
    setColumns((prev) => {
      const fromItems = [...prev[from]];
      const toItems = [...prev[to]];
      const fromIndex = fromItems.findIndex((t) => t.id === active.id);
      if (fromIndex < 0) return prev;
      const [moved] = fromItems.splice(fromIndex, 1);
      const overIndex = toItems.findIndex((t) => t.id === over.id);
      toItems.splice(overIndex >= 0 ? overIndex : toItems.length, 0, moved);
      return { ...prev, [from]: fromItems, [to]: toItems };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const from = findContainer(active.id);
    const to = findContainer(over.id);
    if (!from || !to) return;
    let next = columns;
    if (from === to) {
      const items = columns[from];
      const oldIndex = items.findIndex((t) => t.id === active.id);
      const newIndex = items.findIndex((t) => t.id === over.id);
      if (oldIndex !== newIndex && newIndex >= 0) {
        next = { ...columns, [from]: arrayMove(items, oldIndex, newIndex) };
        setColumns(next);
      }
    }
    persist(next);
  };

  const handleToggle = (task: TaskDto) => {
    setColumns((prev) => {
      const next = { ...prev };
      for (const key of SECTION_ORDER) {
        next[key] = next[key].filter((t) => t.id !== task.id);
      }
      return next;
    });
    startTransition(async () => {
      await toggleTask(task.id);
      router.refresh();
    });
  };

  const handleDelete = (task: TaskDto) => {
    if (!window.confirm(`「${task.title}」を削除しますか？`)) return;
    setColumns((prev) => {
      const next = { ...prev };
      for (const key of SECTION_ORDER) {
        next[key] = next[key].filter((t) => t.id !== task.id);
      }
      return next;
    });
    startTransition(async () => {
      await deleteTask(task.id);
      router.refresh();
    });
  };

  const handleUpdate = (
    task: TaskDto,
    data: { title?: string; dueDate?: string | null; priority?: number }
  ) => {
    setColumns((prev) => {
      const next = { ...prev };
      for (const key of SECTION_ORDER) {
        next[key] = next[key].map((t) =>
          t.id === task.id
            ? {
                ...t,
                title: data.title ?? t.title,
                dueDate: data.dueDate !== undefined ? data.dueDate : t.dueDate,
                priority: data.priority ?? t.priority,
              }
            : t
        );
      }
      return next;
    });
    startTransition(async () => {
      await updateTask(task.id, data);
      router.refresh();
    });
  };

  const refresh = () => router.refresh();

  return (
    <div className="max-w-3xl space-y-8">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        {SECTION_ORDER.map((key) => (
          <Section
            key={key}
            section={key}
            tasks={columns[key]}
            todayStr={todayStr}
            projects={projects}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            onAdded={refresh}
          />
        ))}
        <DragOverlay>
          {activeTask ? (
            <div className="flex items-center gap-2 rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm shadow-lg">
              <span
                className={`size-5 rounded-full border-2 ${PRIORITY_RING[activeTask.priority] ?? PRIORITY_RING[4]}`}
              />
              {activeTask.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {completedTasks.length > 0 && (
        <details className="pt-2">
          <summary className="cursor-pointer text-sm font-bold text-gray-400">
            完了済み（{completedTasks.length}件）
          </summary>
          <ul className="mt-2 space-y-1">
            {completedTasks.map((task) => (
              <li
                key={task.id}
                className="group flex items-center gap-2 rounded-lg px-2 py-1.5"
              >
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      await toggleTask(task.id);
                      router.refresh();
                    })
                  }
                  className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-gray-300 text-white"
                  title="未完了に戻す"
                >
                  <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <span className="flex-1 truncate text-sm text-gray-400 line-through">
                  {task.title}
                </span>
                {task.dueDate && (
                  <span className="text-xs text-gray-300 tabular-nums">
                    {formatShortDate(task.dueDate)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      await deleteTask(task.id);
                      router.refresh();
                    })
                  }
                  className="px-0.5 text-gray-300 opacity-0 hover:text-red-500 group-hover:opacity-100"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
