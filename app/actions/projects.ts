"use server";

import { prisma } from "@/lib/prisma";
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
  const project = await prisma.project.create({ data: projectData(formData) });
  revalidatePath("/projects");
  revalidatePath("/calendar");
  revalidatePath("/");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(id: string, formData: FormData) {
  await prisma.project.update({ where: { id }, data: projectData(formData) });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath("/calendar");
  revalidatePath("/");
  redirect(`/projects/${id}`);
}

export async function updateProjectStatus(id: string, status: string) {
  await prisma.project.update({ where: { id }, data: { status } });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath("/");
}

export async function deleteProject(id: string) {
  await prisma.project.delete({ where: { id } });
  revalidatePath("/projects");
  revalidatePath("/calendar");
  revalidatePath("/");
  redirect("/projects");
}
