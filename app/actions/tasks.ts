"use server";

import { prisma } from "@/lib/prisma";
import { parseDateInput, todayJST } from "@/lib/dates";
import { revalidatePath } from "next/cache";

function revalidateTaskPages() {
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function createTask(formData: FormData) {
  const title = ((formData.get("title") as string) || "").trim();
  if (!title) return;
  const projectId = (formData.get("projectId") as string) || null;
  await prisma.task.create({
    data: {
      title,
      projectId,
      dueDate: parseDateInput(formData.get("dueDate") as string) ?? todayJST(),
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
