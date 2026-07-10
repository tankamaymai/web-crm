"use server";

import { prisma } from "@/lib/prisma";
import { parseDateInput, todayJST } from "@/lib/dates";
import { revalidatePath } from "next/cache";

function revalidateTaskPages() {
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath("/");
}

function normalizePriority(value: unknown): number {
  const p = Number(value);
  return p >= 1 && p <= 4 ? Math.floor(p) : 4;
}

export async function createTask(formData: FormData) {
  const title = ((formData.get("title") as string) || "").trim();
  if (!title) return;
  const projectId = (formData.get("projectId") as string) || null;
  const dueDateRaw = formData.get("dueDate") as string | null;
  // 並び順は同セクション末尾に付ける
  const last = await prisma.task.findFirst({ orderBy: { sortOrder: "desc" } });
  await prisma.task.create({
    data: {
      title,
      projectId,
      priority: normalizePriority(formData.get("priority")),
      dueDate:
        dueDateRaw === "none" ? null : parseDateInput(dueDateRaw) ?? todayJST(),
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
  revalidateTaskPages();
}

export async function toggleTask(id: string) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id } });
  await prisma.task.update({
    where: { id },
    data: {
      completed: !task.completed,
      completedAt: task.completed ? null : new Date(),
    },
  });
  revalidateTaskPages();
}

export async function deleteTask(id: string) {
  await prisma.task.delete({ where: { id } });
  revalidateTaskPages();
}

export async function updateTask(
  id: string,
  data: { title?: string; dueDate?: string | null; priority?: number }
) {
  const update: {
    title?: string;
    dueDate?: Date | null;
    priority?: number;
  } = {};
  if (data.title !== undefined) {
    const title = data.title.trim();
    if (!title) return;
    update.title = title;
  }
  if (data.dueDate !== undefined) {
    update.dueDate = data.dueDate ? parseDateInput(data.dueDate) : null;
  }
  if (data.priority !== undefined) {
    update.priority = normalizePriority(data.priority);
  }
  await prisma.task.update({ where: { id }, data: update });
  revalidateTaskPages();
}

/** ドラッグ&ドロップの結果を一括保存する（並び順と期日） */
export async function reorderTasks(
  updates: { id: string; sortOrder: number; dueDate: string | null }[]
) {
  if (updates.length === 0) return;
  await prisma.$transaction(
    updates.map((u) =>
      prisma.task.update({
        where: { id: u.id },
        data: {
          sortOrder: u.sortOrder,
          dueDate: u.dueDate ? parseDateInput(u.dueDate) : null,
        },
      })
    )
  );
  revalidateTaskPages();
}
