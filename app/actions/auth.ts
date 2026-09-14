"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isLoggedIn } from "@/lib/auth";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  generateSalt,
  generateSessionSecret,
  hashPassword,
  hashesMatch,
} from "@/lib/session";

const MIN_LENGTH = 6;

async function startSession(sessionSecret: string) {
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(sessionSecret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

async function authSettings() {
  return prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
    select: { passwordHash: true, passwordSalt: true, sessionSecret: true },
  });
}

/** 初回セットアップ。まだパスワードが未設定のときだけ実行できる */
export async function setupPassword(formData: FormData) {
  const existing = await authSettings();
  // 設定済みなら乗っ取られないよう何もしない
  if (existing.passwordHash) redirect("/login");

  const password = ((formData.get("password") as string) ?? "").trim();
  const confirm = ((formData.get("confirm") as string) ?? "").trim();

  if (password.length < MIN_LENGTH) redirect("/setup?error=short");
  if (password !== confirm) redirect("/setup?error=mismatch");

  const salt = generateSalt();
  const sessionSecret = generateSessionSecret();
  await prisma.settings.update({
    where: { id: "default" },
    data: {
      passwordHash: await hashPassword(password, salt),
      passwordSalt: salt,
      sessionSecret,
    },
  });

  await startSession(sessionSecret);
  redirect("/");
}

export async function login(formData: FormData) {
  const { passwordHash, passwordSalt, sessionSecret } = await authSettings();
  if (!passwordHash || !passwordSalt || !sessionSecret) redirect("/setup");

  const input = ((formData.get("password") as string) ?? "").trim();
  const hashed = await hashPassword(input, passwordSalt);
  if (!hashesMatch(hashed, passwordHash)) redirect("/login?error=1");

  await startSession(sessionSecret);
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

/** 設定画面からのパスワード変更。現在のパスワードの確認が必要 */
export async function changePassword(formData: FormData) {
  if (!(await isLoggedIn())) redirect("/login");

  const { passwordHash, passwordSalt } = await authSettings();
  if (!passwordHash || !passwordSalt) redirect("/setup");

  const current = ((formData.get("currentPassword") as string) ?? "").trim();
  const next = ((formData.get("newPassword") as string) ?? "").trim();
  const confirm = ((formData.get("confirmPassword") as string) ?? "").trim();

  const currentHashed = await hashPassword(current, passwordSalt);
  if (!hashesMatch(currentHashed, passwordHash)) {
    redirect("/settings?pw=wrong");
  }
  if (next.length < MIN_LENGTH) redirect("/settings?pw=short");
  if (next !== confirm) redirect("/settings?pw=mismatch");

  // 署名鍵も作り直して、他の端末のログインを無効にする
  const salt = generateSalt();
  const sessionSecret = generateSessionSecret();
  await prisma.settings.update({
    where: { id: "default" },
    data: {
      passwordHash: await hashPassword(next, salt),
      passwordSalt: salt,
      sessionSecret,
    },
  });

  await startSession(sessionSecret);
  redirect("/settings?pw=done");
}
