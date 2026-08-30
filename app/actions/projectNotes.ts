"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function revalidateNotePages(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function createProjectNote(projectId: string, formData: FormData) {
  await requireAuth();
  const body = ((formData.get("body") as string) || "").trim();
  if (!body) return;
  await prisma.projectNote.create({ data: { projectId, body } });
  revalidateNotePages(projectId);
}

/** 確認済み / 未確認 を切り替える */
export async function toggleProjectNote(id: string) {
  await requireAuth();
  const note = await prisma.projectNote.findUniqueOrThrow({ where: { id } });
  const updated = await prisma.projectNote.update({
    where: { id },
    data: {
      resolved: !note.resolved,
      resolvedAt: note.resolved ? null : new Date(),
    },
  });
  revalidateNotePages(updated.projectId);
}

export async function deleteProjectNote(id: string) {
  await requireAuth();
  const note = await prisma.projectNote.delete({ where: { id } });
  revalidateNotePages(note.projectId);
}
