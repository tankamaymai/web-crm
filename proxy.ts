import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  getAppPassword,
  verifySessionToken,
} from "@/lib/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const password = getAppPassword();

  // APP_PASSWORD 未設定のときは、セットアップ案内以外を一切表示しない
  if (!password) {
    if (pathname === "/setup") return NextResponse.next();
    return NextResponse.rewrite(new URL("/setup", request.url));
  }

  const loggedIn = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
    password
  );

  if (pathname === "/login") {
    // ログイン済みならログイン画面には留まらせない
    return loggedIn
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next();
  }

  if (pathname === "/setup") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!loggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 静的アセットとPWAのアイコン/マニフェスト以外すべてを通す。
    // 請求書PDF(/api/...)も認証対象にしたいので api は除外しない。
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-.*\\.png|apple-touch-icon\\.png|fonts/).*)",
  ],
};
