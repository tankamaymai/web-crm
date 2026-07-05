"use server";

import { prisma } from "@/lib/prisma";
import { addDays, parseDateInput, todayJST } from "@/lib/dates";
import { nextInvoiceNumber, TAX_MODES } from "@/lib/invoice";
import { getSettings } from "@/lib/settings";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function revalidateInvoicePages(id?: string) {
  revalidatePath("/invoices");
  if (id) revalidatePath(`/invoices/${id}`);
  revalidatePath("/");
}

/** 案件からワンクリックで請求書を作成する */
export async function createInvoiceFromProject(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { client: true },
  });
  const settings = await getSettings();
  const issueDate = todayJST();
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: await nextInvoiceNumber(),
      clientId: project.clientId,
      projectId: project.id,
      issueDate,
      dueDate: addDays(issueDate, settings.paymentTermDays),
      taxRate: settings.defaultTaxRate,
      taxMode: project.client.taxMode,
      notes: settings.invoiceNotes,
      items: {
        create: [
          {
            description: project.title,
            quantity: 1,
            unitPrice: project.amount,
          },
        ],
      },
    },
  });
  revalidateInvoicePages(invoice.id);
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoice(id: string, formData: FormData) {
  const taxMode = formData.get("taxMode") as string;
  await prisma.invoice.update({
    where: { id },
    data: {
      issueDate: parseDateInput(formData.get("issueDate") as string) ?? todayJST(),
      dueDate: parseDateInput(formData.get("dueDate") as string),
      taxRate: parseInt(formData.get("taxRate") as string, 10) || 10,
      taxMode: TAX_MODES.includes(taxMode as (typeof TAX_MODES)[number])
        ? taxMode
        : "STANDARD",
      notes: (formData.get("notes") as string) || null,
    },
  });
  revalidateInvoicePages(id);
}

export async function setInvoiceStatus(id: string, status: string) {
  await prisma.invoice.update({
    where: { id },
    data: {
      status,
      paidAt: status === "PAID" ? new Date() : null,
    },
  });
  revalidateInvoicePages(id);
}

export async function deleteInvoice(id: string) {
  await prisma.invoice.delete({ where: { id } });
  revalidateInvoicePages();
  redirect("/invoices");
}

export async function addInvoiceItem(invoiceId: string, formData: FormData) {
  const description = ((formData.get("description") as string) || "").trim();
  if (!description) return;
  const last = await prisma.invoiceItem.findFirst({
    where: { invoiceId },
    orderBy: { sortOrder: "desc" },
  });
  await prisma.invoiceItem.create({
    data: {
      invoiceId,
      description,
      quantity: parseInt(formData.get("quantity") as string, 10) || 1,
      unitPrice: parseInt(formData.get("unitPrice") as string, 10) || 0,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
  revalidateInvoicePages(invoiceId);
}

export async function deleteInvoiceItem(id: string) {
  const item = await prisma.invoiceItem.delete({ where: { id } });
  revalidateInvoicePages(item.invoiceId);
}
