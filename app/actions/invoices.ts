"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
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
  await requireAuth();
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
            projectId: project.id,
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
 * 請求書を一から作成する。明細は複数行まとめて受け取り、
 * 行ごとに案件を紐付けられる（1顧客の複数案件を1枚にまとめられる）。
 */
export async function createInvoice(formData: FormData) {
  await requireAuth();
  const clientId = (formData.get("clientId") as string) || "";
  if (!clientId) return;
  const settings = await getSettings();
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
  });

  const issueDate = parseDateInput(formData.get("issueDate") as string) ?? todayJST();
  const dueDate =
    parseDateInput(formData.get("dueDate") as string) ?? endOfNextMonth(issueDate);
  const taxMode = formData.get("taxMode") as string;

  // 明細は description[] / quantity[] / unitPrice[] / itemProjectId[] の並列配列で届く
  const descriptions = formData.getAll("description") as string[];
  const quantities = formData.getAll("quantity") as string[];
  const unitPrices = formData.getAll("unitPrice") as string[];
  const itemProjectIds = formData.getAll("itemProjectId") as string[];

  const items = descriptions
    .map((description, i) => ({
      description: (description || "").trim(),
      quantity: parseInt(quantities[i], 10) || 1,
      unitPrice: parseInt(unitPrices[i], 10) || 0,
      projectId: itemProjectIds[i] || null,
      sortOrder: i,
    }))
    .filter((item) => item.description.length > 0);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: await nextInvoiceNumber(),
      clientId,
      issueDate,
      dueDate,
      taxRate: parseInt(formData.get("taxRate") as string, 10) || settings.defaultTaxRate,
      taxMode: TAX_MODES.includes(taxMode as (typeof TAX_MODES)[number])
        ? taxMode
        : client.taxMode,
      notes: (formData.get("notes") as string) || settings.invoiceNotes,
      items: { create: items },
    },
  });
  revalidateInvoicePages(invoice.id);
  revalidatePath("/projects");
  redirect(`/invoices/${invoice.id}`);
}

/**
 * 月額案件のうち今月分の請求書がまだない案件について、まとめてドラフトを作成する。
 * ダッシュボードの「今月分をまとめて発行」ボタンから呼ばれる。
 */
export async function generateMonthlyInvoices() {
  await requireAuth();
  const settings = await getSettings();
  const today = todayJST();
  const monthStart = startOfMonth(today);
  const nextMonth = addMonths(monthStart, 1);

  const targets = await prisma.project.findMany({
    where: {
      recurring: true,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
      invoiceItems: {
        none: { invoice: { issueDate: { gte: monthStart, lt: nextMonth } } },
      },
    },
    include: { client: true },
    orderBy: { createdAt: "asc" },
  });

  for (const project of targets) {
    await prisma.invoice.create({
      data: {
        invoiceNumber: await nextInvoiceNumber(),
        clientId: project.clientId,
        issueDate: today,
        dueDate: endOfNextMonth(today),
        taxRate: settings.defaultTaxRate,
        taxMode: project.client.taxMode,
        notes: settings.invoiceNotes,
        items: {
          create: [
            {
              description: `${project.title}（${today.getUTCMonth() + 1}月分）`,
              projectId: project.id,
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
  await requireAuth();
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
  await requireAuth();
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
  await requireAuth();
  await prisma.invoice.delete({ where: { id } });
  revalidateInvoicePages();
  redirect("/invoices");
}

export async function addInvoiceItem(invoiceId: string, formData: FormData) {
  await requireAuth();
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
      projectId: (formData.get("itemProjectId") as string) || null,
      quantity: parseInt(formData.get("quantity") as string, 10) || 1,
      unitPrice: parseInt(formData.get("unitPrice") as string, 10) || 0,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
  revalidateInvoicePages(invoiceId);
  revalidatePath("/projects");
}

/**
 * 未請求の案件を、既存の請求書に明細としてまとめて追加する。
 * 「同じ顧客の複数案件を1枚にまとめる」ための導線。
 */
export async function addProjectsToInvoice(
  invoiceId: string,
  formData: FormData
) {
  await requireAuth();
  const projectIds = formData.getAll("projectIds") as string[];
  if (projectIds.length === 0) return;
  const [invoice, projects, last] = await Promise.all([
    prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } }),
    prisma.project.findMany({ where: { id: { in: projectIds } } }),
    prisma.invoiceItem.findFirst({
      where: { invoiceId },
      orderBy: { sortOrder: "desc" },
    }),
  ]);
  let sortOrder = (last?.sortOrder ?? 0) + 1;
  await prisma.invoiceItem.createMany({
    data: projects
      // 念のため、請求書の宛先と違う顧客の案件は追加しない
      .filter((p) => p.clientId === invoice.clientId)
      .map((p) => ({
        invoiceId,
        description: p.title,
        projectId: p.id,
        quantity: 1,
        // 案件の受注金額は税別。請求書は税込で保持するため税込に換算する
        unitPrice: Math.round((p.amount * (100 + invoice.taxRate)) / 100),
        sortOrder: sortOrder++,
      })),
  });
  revalidateInvoicePages(invoiceId);
  revalidatePath("/projects");
}

export async function deleteInvoiceItem(id: string) {
  await requireAuth();
  const item = await prisma.invoiceItem.delete({ where: { id } });
  revalidateInvoicePages(item.invoiceId);
  revalidatePath("/projects");
}
