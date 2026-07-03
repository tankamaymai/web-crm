import { prisma } from "@/lib/prisma";
import type { Settings } from "@prisma/client";

/** 設定を取得（未作成ならデフォルト値で作成して返す） */
export async function getSettings(): Promise<Settings> {
  return prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}
