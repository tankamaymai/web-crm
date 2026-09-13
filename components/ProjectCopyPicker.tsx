"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type CopySource = {
  id: string;
  title: string;
  clientName: string;
  statusLabel: string;
  /** 表示用の年月（例: 2026/7）。期日がなければ null */
  monthLabel: string | null;
  credentialCount: number;
};

const MAX_RESULTS = 30;

export default function ProjectCopyPicker({
  sources,
}: {
  sources: CopySource[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? sources.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.clientName.toLowerCase().includes(q)
        )
      : sources;
    return matched.slice(0, MAX_RESULTS);
  }, [sources, query]);

  if (sources.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100"
      >
        📋 過去の案件からコピーして作成
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50/60 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-sky-900">
          コピー元の案件を選んでください
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-white"
        >
          閉じる
        </button>
      </div>

      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="案件名・顧客名で絞り込み"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />

      {results.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">該当する案件がありません</p>
      ) : (
        <ul className="mt-2 max-h-72 space-y-0.5 overflow-y-auto">
          {results.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => router.push(`/projects/new?from=${s.id}`)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-white"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.title}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {s.clientName}
                    {s.monthLabel ? ` / ${s.monthLabel}` : ""}
                  </span>
                </span>
                {s.credentialCount > 0 && (
                  <span
                    title={`サイト情報 ${s.credentialCount}件`}
                    className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700"
                  >
                    🔑 {s.credentialCount}
                  </span>
                )}
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs text-gray-500">
                  {s.statusLabel}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {sources.length > results.length && query.trim() === "" && (
        <p className="mt-2 text-xs text-gray-400">
          最近の{MAX_RESULTS}件を表示しています。絞り込むと他の案件も探せます。
        </p>
      )}
    </div>
  );
}
