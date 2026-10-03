"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Anthropic from "@anthropic-ai/sdk";

export async function updateSettings(formData: FormData) {
  await requireAuth();
  const data = {
    businessName: (formData.get("businessName") as string) || "",
    postalCode: (formData.get("postalCode") as string) || null,
    address: (formData.get("address") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    registrationNumber: (formData.get("registrationNumber") as string) || null,
    bankInfo: (formData.get("bankInfo") as string) || null,
    defaultTaxRate: parseInt(formData.get("defaultTaxRate") as string, 10) || 10,
    monthlyGoal: parseInt(formData.get("monthlyGoal") as string, 10) || 0,
    // paymentTermDays はフォームから送られなくなった（支払期限は翌月末日固定）。
    // 既存カラムは残すため、ここでは更新対象に含めない。
    invoiceNotes: (formData.get("invoiceNotes") as string) || null,
  };
  await prisma.settings.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });
  revalidatePath("/settings");
  revalidatePath("/");
}

/** PDF書式のAI読み取りに使うClaude APIキーを登録する（実際に使えるか確認してから保存） */
export async function saveAnthropicApiKey(formData: FormData) {
  await requireAuth();
  const apiKey = ((formData.get("apiKey") as string) || "").trim();
  if (!apiKey.startsWith("sk-ant-")) redirect("/settings?ai=format#ai");

  let result = "saved";
  try {
    await new Anthropic({ apiKey }).models.list({ limit: 1 });
  } catch (e) {
    result =
      e instanceof Anthropic.AuthenticationError ||
      e instanceof Anthropic.PermissionDeniedError
        ? "invalid"
        : "unreachable";
  }
  if (result === "saved") {
    await prisma.settings.upsert({
      where: { id: "default" },
      update: { anthropicApiKey: apiKey },
      create: { id: "default", anthropicApiKey: apiKey },
    });
    revalidatePath("/invoices/formats");
  }
  redirect(`/settings?ai=${result}#ai`);
}

export async function deleteAnthropicApiKey() {
  await requireAuth();
  await prisma.settings.update({
    where: { id: "default" },
    data: { anthropicApiKey: null },
  });
  revalidatePath("/invoices/formats");
  redirect("/settings?ai=deleted#ai");
}
