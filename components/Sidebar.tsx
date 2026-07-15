"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "ダッシュボード", icon: "📊" },
  { href: "/projects", label: "案件", icon: "📁" },
  { href: "/calendar", label: "カレンダー", icon: "📅" },
  { href: "/tasks", label: "タスク", icon: "✅" },
  { href: "/invoices", label: "請求書", icon: "🧾" },
  { href: "/clients", label: "顧客", icon: "👥" },
  { href: "/settings", label: "設定", icon: "⚙️" },
];

function Logo() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 text-sm font-bold text-white">
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
    <nav className="flex-1 space-y-0.5 px-3 py-2">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              active
                ? "bg-sky-500/15 font-medium text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
            {active && (
              <span className="ml-auto size-1.5 rounded-full bg-sky-400" />
            )}
          </Link>
        );
      })}
    </nav>
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

  return (
    <>
      {/* モバイル用ヘッダーバー */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 text-slate-200 lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="text-base font-bold leading-tight text-white">
            Web CRM
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="メニューを開く"
          className="flex size-9 items-center justify-center rounded-lg text-slate-200 hover:bg-slate-800"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
      </div>

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
        <p className="px-5 pb-4 text-[11px] text-slate-500">
          for Web制作フリーランス
        </p>
      </aside>
    </>
  );
}
