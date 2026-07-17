"use server";

import { prisma } from "@/lib/prisma";
import {
  addMonths,
  endOfNextMonth,
  parseDateInput,
  startOfMonth,
  todayJST,
} from "@/lib/dates";
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
      // 支払期限は発行月の翌月末日
      dueDate: endOfNextMonth(issueDate),
      taxRate: settings.defaultTaxRate,
      taxMode: project.client.taxMode,
      notes: settings.invoiceNotes,
      items: {
        create: [
          {
            description: project.title,
            quantity: 1,
            // 案件の受注金額は税別。請求書は税込で保持するため税込に換算する
            unitPrice: Math.round(
              (project.amount * (100 + settings.defaultTaxRate)) / 100
            ),
          },
        ],
      },
    },
  });
  revalidateInvoicePages(invoice.id);
  redirect(`/invoices/${invoice.id}`);
}

/**
 * 月額案件のうち今月分の請求書がまだない案件について、まとめてドラフトを作成する。
 * ダッシュボードの「今月分をまとめて発行」ボタンから呼ばれる。
 */
export async function generateMonthlyInvoices() {
  const settings = await getSettings();
  const today = todayJST();
  const monthStart = startOfMonth(today);
  const nextMonth = addMonths(monthStart, 1);

  const targets = await prisma.project.findMany({
    where: {
      recurring: true,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
      invoices: { none: { issueDate: { gte: monthStart, lt: nextMonth } } },
    },
    include: { client: true },
    orderBy: { createdAt: "asc" },
  });

  for (const project of targets) {
    await prisma.invoice.create({
      data: {
        invoiceNumber: await nextInvoiceNumber(),
        clientId: project.clientId,
        projectId: project.id,
        issueDate: today,
        dueDate: endOfNextMonth(today),
        taxRate: settings.defaultTaxRate,
        taxMode: project.client.taxMode,
        notes: settings.invoiceNotes,
        items: {
          create: [
            {
              description: `${project.title}（${today.getUTCMonth() + 1}月分）`,
              quantity: 1,
              // 案件の受注金額は税別。請求書は税込で保持するため税込に換算する
              unitPrice: Math.round(
                (project.amount * (100 + settings.defaultTaxRate)) / 100
              ),
            },
          ],
        },
      },
    });
  }
  revalidateInvoicePages();
  redirect("/invoices?status=DRAFT");
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
