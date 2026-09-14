import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

type AuthConfig = {
  passwordHash: string | null;
  passwordSalt: string | null;
  sessionSecret: string | null;
};

async function getAuthConfig(): Promise<AuthConfig> {
  const settings = await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
    select: { passwordHash: true, passwordSalt: true, sessionSecret: true },
  });
  return settings;
}

/** パスワードがまだ設定されていない（初回セットアップが必要な）状態か */
export async function isPasswordConfigured(): Promise<boolean> {
  const { passwordHash, passwordSalt, sessionSecret } = await getAuthConfig();
  return Boolean(passwordHash && passwordSalt && sessionSecret);
}

export async function isLoggedIn(): Promise<boolean> {
  const { passwordHash, sessionSecret } = await getAuthConfig();
  if (!passwordHash || !sessionSecret) return false;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, sessionSecret);
}

/**
 * ページとServer Actionの入口で呼ぶ認証ガード。
 * ページごとに明示的に呼ぶ方式にしている（Next.jsのドキュメントも
 * 入口ごとの確認を推奨しているため）。
 */
export async function requireAuth(): Promise<void> {
  const { passwordHash, sessionSecret } = await getAuthConfig();
  if (!passwordHash || !sessionSecret) redirect("/setup");
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token, sessionSecret))) redirect("/login");
}
