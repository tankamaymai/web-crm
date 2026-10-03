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
    <select
      aria-label="ステータスを変更"
      title="クリックしてステータスを変更"
      value={value}
      disabled={pending}
      onChange={(e) => handleChange(e.target.value)}
      className={`cursor-pointer appearance-none rounded-full border-0 py-0.5 pl-2.5 pr-6 text-xs font-medium whitespace-nowrap bg-[length:12px] bg-[right_0.4rem_center] bg-no-repeat focus:ring-2 focus:ring-sky-400 focus:outline-none disabled:opacity-60 ${
        PROJECT_STATUS_COLORS[value] ?? "bg-gray-100 text-gray-700"
      }`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236b7280'%3E%3Cpath d='M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z'/%3E%3C/svg%3E\")",
      }}
    >
      {PROJECT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {PROJECT_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
