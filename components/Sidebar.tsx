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
    <aside className="w-56 shrink-0 bg-slate-900 text-slate-200 flex flex-col min-h-screen">
      <div className="px-5 py-5 border-b border-slate-700">
        <Link href="/" className="text-lg font-bold text-white">
          Web CRM
        </Link>
        <p className="text-xs text-slate-400 mt-1">案件管理</p>
      </div>
      <nav className="flex-1 py-3">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-slate-700/70 text-white font-medium border-l-2 border-sky-400"
                  : "hover:bg-slate-800 text-slate-300"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
