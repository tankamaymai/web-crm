"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { TAX_MODES } from "@/lib/invoice";
import { revalidatePath } from "next/cache";

function revalidateTemplatePages() {
  revalidatePath("/invoices/templates");
  revalidatePath("/invoices/new");
}

/** フォームの並列配列から明細を組み立てる */
function itemsFromForm(formData: FormData) {
  const descriptions = formData.getAll("description") as string[];
  const quantities = formData.getAll("quantity") as string[];
  const unitPrices = formData.getAll("unitPrice") as string[];
  return descriptions
    .map((description, i) => ({
      description: (description || "").trim(),
      quantity: parseInt(quantities[i], 10) || 1,
      unitPrice: parseInt(unitPrices[i], 10) || 0,
      sortOrder: i,
    }))
    .filter((item) => item.description.length > 0);
}

function normalizeTaxMode(value: FormDataEntryValue | null): string | null {
  const taxMode = (value as string) || "";
  return TAX_MODES.includes(taxMode as (typeof TAX_MODES)[number])
    ? taxMode
    : null;
}

export async function createInvoiceTemplate(formData: FormData) {
  await requireAuth();
  const name = ((formData.get("name") as string) || "").trim();
  if (!name) return;

  const last = await prisma.invoiceTemplate.findFirst({
    orderBy: { sortOrder: "desc" },
  });

  await prisma.invoiceTemplate.create({
    data: {
      name,
      notes: ((formData.get("notes") as string) || "").trim() || null,
      taxMode: normalizeTaxMode(formData.get("taxMode")),
      sortOrder: (last?.sortOrder ?? 0) + 1,
      items: { create: itemsFromForm(formData) },
    },
  });
  revalidateTemplatePages();
}

export async function updateInvoiceTemplate(id: string, formData: FormData) {
  await requireAuth();
  const name = ((formData.get("name") as string) || "").trim();
  if (!name) return;

  // 明細は毎回作り直す（並び順や行数の変更をそのまま反映するため）
  await prisma.$transaction([
    prisma.invoiceTemplateItem.deleteMany({ where: { templateId: id } }),
    prisma.invoiceTemplate.update({
      where: { id },
      data: {
        name,
        notes: ((formData.get("notes") as string) || "").trim() || null,
        taxMode: normalizeTaxMode(formData.get("taxMode")),
        items: { create: itemsFromForm(formData) },
      },
    }),
  ]);
  revalidateTemplatePages();
}

export async function deleteInvoiceTemplate(id: string) {
  await requireAuth();
  await prisma.invoiceTemplate.delete({ where: { id } });
  revalidateTemplatePages();
}

/** 既存の請求書の内容をそのままテンプレートとして保存する */
export async function saveInvoiceAsTemplate(
  invoiceId: string,
  formData: FormData
) {
  await requireAuth();
  const name = ((formData.get("name") as string) || "").trim();
  if (!name) return;

  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  const last = await prisma.invoiceTemplate.findFirst({
    orderBy: { sortOrder: "desc" },
  });

  await prisma.invoiceTemplate.create({
    data: {
      name,
      notes: invoice.notes,
      taxMode: invoice.taxMode,
      sortOrder: (last?.sortOrder ?? 0) + 1,
      items: {
        create: invoice.items.map((item, i) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sortOrder: i,
        })),
      },
    },
  });
  revalidateTemplatePages();
  revalidatePath(`/invoices/${invoiceId}`);
}
