"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/actions/auth";
import NavIcon from "@/components/NavIcon";

const NAV_ITEMS = [
  { href: "/", label: "ダッシュボード", short: "ホーム", icon: "home" },
  { href: "/projects", label: "案件", short: "案件", icon: "folder" },
  { href: "/tasks", label: "タスク", short: "タスク", icon: "check" },
  { href: "/invoices", label: "請求書", short: "請求書", icon: "receipt" },
  { href: "/calendar", label: "カレンダー", short: "予定", icon: "calendar" },
  { href: "/clients", label: "顧客", short: "顧客", icon: "users" },
  { href: "/settings", label: "設定", short: "設定", icon: "settings" },
];

// スマホの下タブに常に出す項目（残りは「メニュー」から開く）
const TAB_HREFS = ["/", "/projects", "/tasks", "/invoices"];

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Logo() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-sky-700 text-sm font-bold text-white">
      W
    </span>
  );
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-1 px-3 py-2">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors ${
              active
                ? "bg-sky-600 font-semibold text-white shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function LogoutButton() {
  return (
    <form action={logout} className="px-3 pb-2">
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
      >
        <NavIcon name="logout" />
        ログアウト
      </button>
    </form>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // ドロワーが開いている間は背景のスクロールを止める
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // ログイン画面・セットアップ画面ではナビゲーションを出さない
  if (pathname === "/login" || pathname === "/setup") return null;

  return (
    <>
      {/* モバイル用ヘッダーバー */}
      <div className="flex items-center border-b border-slate-800 bg-slate-900 px-4 py-3 text-slate-200 lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="text-base font-bold leading-tight text-white">
            Web CRM
          </span>
        </Link>

      </div>

      {/* モバイル用の下タブ。よく使う画面へ1タップで移動できるようにする */}
      <nav
        aria-label="メインメニュー"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {NAV_ITEMS.filter((item) => TAB_HREFS.includes(item.href)).map(
          (item) => {
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  active ? "text-sky-700" : "text-gray-500"
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full ${
                    active ? "bg-sky-100" : ""
                  }`}
                >
                  <NavIcon name={item.icon} />
                </span>
                {item.short}
              </Link>
            );
          }
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
            NAV_ITEMS.some(
              (item) =>
                !TAB_HREFS.includes(item.href) && isActive(item.href, pathname)
            )
              ? "text-sky-700"
              : "text-gray-500"
          }`}
        >
          <span className="flex h-7 w-12 items-center justify-center rounded-full">
            <NavIcon name="menu" />
          </span>
          その他
        </button>
      </nav>

      {/* モバイル用ドロワー */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col bg-slate-900 text-slate-200 shadow-xl">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-2.5">
                <Logo />
                <div>
                  <p className="text-base font-bold leading-tight text-white">
                    Web CRM
                  </p>
                  <p className="text-[11px] text-slate-400">案件管理</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="メニューを閉じる"
                className="flex size-9 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            <LogoutButton />
            <p className="px-5 pb-4 text-[11px] text-slate-500">
              for Web制作フリーランス
            </p>
          </aside>
        </div>
      )}

      {/* デスクトップ用サイドバー */}
      <aside className="hidden min-h-screen w-56 shrink-0 flex-col bg-slate-900 text-slate-200 lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <Logo />
          <div>
            <Link href="/" className="block text-base font-bold leading-tight text-white">
              Web CRM
            </Link>
            <p className="text-[11px] text-slate-400">案件管理</p>
          </div>
        </div>
        <NavLinks pathname={pathname} />
        <LogoutButton />
        <p className="px-5 pb-4 text-[11px] text-slate-500">
          for Web制作フリーランス
        </p>
      </aside>
    </>
  );
}
