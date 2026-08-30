"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  getAppPassword,
  passwordMatches,
} from "@/lib/session";

export async function login(formData: FormData) {
  const password = getAppPassword();
  if (!password) redirect("/setup");

  const input = (formData.get("password") as string) ?? "";
  if (!(await passwordMatches(input, password))) {
    redirect("/login?error=1");
  }

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
