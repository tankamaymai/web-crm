import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  getAppPassword,
  verifySessionToken,
} from "@/lib/session";

/** ログイン済みかどうか */
export async function isLoggedIn(): Promise<boolean> {
  const password = getAppPassword();
  if (!password) return false;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, password);
}

/**
 * Server Action の入口で呼ぶ認証ガード。
 * Server Action は proxy のパスマッチだけでは守り切れないため
 * （Next.jsのドキュメントも個別チェックを推奨）、更新系の入口で必ず確認する。
 */
export async function requireAuth(): Promise<void> {
  if (!(await isLoggedIn())) redirect("/login");
}
