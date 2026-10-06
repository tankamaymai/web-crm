"use client";

import { useState, useTransition } from "react";
import { updateProjectStatus } from "@/app/actions/projects";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
} from "@/lib/status";

/**
 * 案件ステータスをその場で切り替えるセレクト。
 * 見た目はステータスバッジのまま、タップすると選択肢が開く。
 */
export default function ProjectStatusSelect({
  projectId,
  status,
}: {
  projectId: string;
  status: string;
}) {
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();

  const handleChange = (next: string) => {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      try {
        await updateProjectStatus(projectId, next);
      } catch {
        setValue(previous);
        alert("ステータスを変更できませんでした。もう一度お試しください。");
      }
    });
  };

  return (
    <span className="relative inline-flex">
      <select
        aria-label="ステータスを変更"
        title="クリックしてステータスを変更"
        value={value}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value)}
        className={`cursor-pointer appearance-none rounded-full border-0 py-1 pl-3 pr-7 text-xs font-semibold whitespace-nowrap focus:ring-2 focus:ring-sky-400 focus:outline-none disabled:opacity-60 ${
          PROJECT_STATUS_COLORS[value] ?? "bg-gray-100 text-gray-700"
        }`}
      >
        {PROJECT_STATUSES.map((s) => (
          <option key={s} value={s} className="bg-white text-gray-900">
            {PROJECT_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      {/* 選べることが分かるように下向き矢印を重ねる（文字色に合わせる） */}
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
        className={`pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 ${
          (PROJECT_STATUS_COLORS[value] ?? "").includes("text-white")
            ? "text-white"
            : "text-gray-700"
        }`}
      >
        <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
      </svg>
    </span>
  );
}
