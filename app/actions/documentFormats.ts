"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { DocumentFormatError, readDocumentFormat } from "@/lib/ai/readDocumentFormat";
import { revalidatePath } from "next/cache";

// next.config.ts の serverActions.bodySizeLimit（6mb）より少し小さくしておく
const MAX_PDF_BYTES = 5 * 1024 * 1024;

export type ImportFormatState = { error?: string; createdId?: string };

/** アップロードされたPDFの見た目をAIで読み取り、書式として保存する */
export async function importDocumentFormat(
  _prev: ImportFormatState,
  formData: FormData
): Promise<ImportFormatState> {
  await requireAuth();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "PDFファイルを選択してください。" };
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "PDFファイルのみ取り込めます。" };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { error: "PDFが大きすぎます（5MBまで）。" };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return { error: "PDFファイルとして読み込めませんでした。" };
  }

  try {
    const { layout } = await readDocumentFormat(buffer);
    const name =
      ((formData.get("name") as string) || "").trim() ||
      file.name.replace(/\.pdf$/i, "") ||
      layout.documentTitle;
    const format = await prisma.documentFormat.create({
      data: { name, layout, sourceFileName: file.name },
    });
    revalidatePath("/invoices/formats");
    return { createdId: format.id };
  } catch (e) {
    if (e instanceof DocumentFormatError) return { error: e.message };
    console.error(e);
    return { error: "取り込みに失敗しました。もう一度お試しください。" };
  }
}

export async function renameDocumentFormat(id: string, formData: FormData) {
  await requireAuth();
  const name = ((formData.get("name") as string) || "").trim();
  if (!name) return;
  await prisma.documentFormat.update({ where: { id }, data: { name } });
  revalidatePath("/invoices/formats");
}

export async function deleteDocumentFormat(id: string) {
  await requireAuth();
  // 使用中の請求書は onDelete: SetNull で標準の書式に戻る
  await prisma.documentFormat.delete({ where: { id } });
  revalidatePath("/invoices/formats");
  revalidatePath("/invoices");
}
