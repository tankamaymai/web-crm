"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateSettings(formData: FormData) {
  const data = {
    businessName: (formData.get("businessName") as string) || "",
    postalCode: (formData.get("postalCode") as string) || null,
    address: (formData.get("address") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    registrationNumber: (formData.get("registrationNumber") as string) || null,
    bankInfo: (formData.get("bankInfo") as string) || null,
    defaultTaxRate: parseInt(formData.get("defaultTaxRate") as string, 10) || 10,
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
}
