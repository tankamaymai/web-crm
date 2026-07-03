"use server";

import { prisma } from "@/lib/prisma";
import { TAX_MODES } from "@/lib/invoice";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function clientData(formData: FormData) {
  const taxMode = formData.get("taxMode") as string;
  return {
    name: (formData.get("name") as string).trim(),
    company: (formData.get("company") as string) || null,
    email: (formData.get("email") as string) || null,
    phone: (formData.get("phone") as string) || null,
    taxMode: TAX_MODES.includes(taxMode as (typeof TAX_MODES)[number])
      ? taxMode
      : "STANDARD",
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
