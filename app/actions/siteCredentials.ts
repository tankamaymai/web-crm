"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
}

/** 空文字は null にして「未入力」と区別しない */
function value(formData: FormData, key: string): string | null {
  const raw = ((formData.get(key) as string) || "").trim();
  return raw.length > 0 ? raw : null;
}

export async function createSiteCredential(
  projectId: string,
  formData: FormData
) {
  await requireAuth();
  const label = ((formData.get("label") as string) || "").trim();
  if (!label) return;

  const last = await prisma.siteCredential.findFirst({
    where: { projectId },
    orderBy: { sortOrder: "desc" },
  });

  await prisma.siteCredential.create({
    data: {
      projectId,
      label,
      url: value(formData, "url"),
      loginId: value(formData, "loginId"),
      password: value(formData, "password"),
      note: value(formData, "note"),
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
  revalidateProject(projectId);
}

export async function updateSiteCredential(id: string, formData: FormData) {
  await requireAuth();
  const label = ((formData.get("label") as string) || "").trim();
  if (!label) return;

  const credential = await prisma.siteCredential.update({
    where: { id },
    data: {
      label,
      url: value(formData, "url"),
      loginId: value(formData, "loginId"),
      password: value(formData, "password"),
      note: value(formData, "note"),
    },
  });
  revalidateProject(credential.projectId);
}

export async function deleteSiteCredential(id: string) {
  await requireAuth();
  const credential = await prisma.siteCredential.delete({ where: { id } });
  revalidateProject(credential.projectId);
}
