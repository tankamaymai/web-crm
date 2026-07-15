"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "ダッシュボード", icon: "📊" },
  { href: "/projects", label: "案件", icon: "📁" },
  { href: "/calendar", label: "カレンダー", icon: "📅" },
  { href: "/tasks", label: "タスク", icon: "✅" },
  { href: "/invoices", label: "請求書", icon: "🧾" },
  { href: "/clients", label: "顧客", icon: "👥" },
  { href: "/settings", label: "設定", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex min-h-screen w-56 shrink-0 flex-col bg-slate-900 text-slate-200">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 text-sm font-bold text-white">
          W
        </span>
        <div>
          <Link href="/" className="block text-base font-bold leading-tight text-white">
            Web CRM
          </Link>
          <p className="text-[11px] text-slate-400">案件管理</p>
        </div>
      </div>
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
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
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
      <p className="px-5 pb-4 text-[11px] text-slate-500">
        for Web制作フリーランス
      </p>
    </aside>
  );
}
