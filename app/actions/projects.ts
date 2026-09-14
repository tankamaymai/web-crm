"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { parseDateInput } from "@/lib/dates";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function projectData(formData: FormData) {
  return {
    title: (formData.get("title") as string).trim(),
    clientId: formData.get("clientId") as string,
    status: formData.get("status") as string,
    amount: parseInt(formData.get("amount") as string, 10) || 0,
    recurring: formData.get("recurring") === "on",
    startDate: parseDateInput(formData.get("startDate") as string),
    dueDate: parseDateInput(formData.get("dueDate") as string),
    siteUrl: (formData.get("siteUrl") as string) || null,
    description: (formData.get("description") as string) || null,
    notes: (formData.get("notes") as string) || null,
  };
}

export async function createProject(formData: FormData) {
  await requireAuth();
  const project = await prisma.project.create({ data: projectData(formData) });

  // 過去案件からのコピー時に、サイト情報（テストサイトのURL/ID/パスワード等）を引き継ぐ。
  // 修正案件では同じテストサイトを使うことが多いため。
  const copyFrom = (formData.get("copyFrom") as string) || null;
  if (copyFrom && formData.get("copyCredentials") === "on") {
    const credentials = await prisma.siteCredential.findMany({
      where: { projectId: copyFrom },
      orderBy: { sortOrder: "asc" },
    });
    if (credentials.length > 0) {
      await prisma.siteCredential.createMany({
        data: credentials.map((c) => ({
          projectId: project.id,
          label: c.label,
          url: c.url,
          loginId: c.loginId,
          password: c.password,
          note: c.note,
          sortOrder: c.sortOrder,
        })),
      });
    }
  }

  revalidatePath("/projects");
  revalidatePath("/calendar");
  revalidatePath("/");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(id: string, formData: FormData) {
  await requireAuth();
  await prisma.project.update({ where: { id }, data: projectData(formData) });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath("/calendar");
  revalidatePath("/");
  redirect(`/projects/${id}`);
}

export async function updateProjectStatus(id: string, status: string) {
  await requireAuth();
  await prisma.project.update({ where: { id }, data: { status } });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath("/");
}

export async function deleteProject(id: string) {
  await requireAuth();
  await prisma.project.delete({ where: { id } });
  revalidatePath("/projects");
  revalidatePath("/calendar");
  revalidatePath("/");
  redirect("/projects");
}
