"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function clientData(formData: FormData) {
  return {
    name: (formData.get("name") as string).trim(),
    company: (formData.get("company") as string) || null,
    email: (formData.get("email") as string) || null,
    phone: (formData.get("phone") as string) || null,
    notes: (formData.get("notes") as string) || null,
  };
}

export async function createClient(formData: FormData) {
  await prisma.client.create({ data: clientData(formData) });
  revalidatePath("/clients");
}

export async function updateClient(id: string, formData: FormData) {
  await prisma.client.update({ where: { id }, data: clientData(formData) });
  revalidatePath("/clients");
  redirect("/clients");
}

export async function deleteClient(id: string) {
  const count = await prisma.project.count({ where: { clientId: id } });
  if (count > 0) {
    throw new Error("案件が紐づいている顧客は削除できません");
  }
  await prisma.client.delete({ where: { id } });
  revalidatePath("/clients");
}
