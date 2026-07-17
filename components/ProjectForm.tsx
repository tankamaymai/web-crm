import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/status";
import { toDateInputValue } from "@/lib/dates";
import type { Client, Project } from "@prisma/client";
import Link from "next/link";

export default function ProjectForm({
  action,
  clients,
  project,
  cancelHref,
}: {
  action: (formData: FormData) => Promise<void>;
  clients: Client[];
  project?: Project;
  cancelHref: string;
}) {
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm";
  return (
    <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className="text-sm text-gray-600">案件名 *</span>
        <input name="title" required defaultValue={project?.title} className={inputClass} />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">顧客 *</span>
        <select
          name="clientId"
          required
          defaultValue={project?.clientId ?? ""}
          className={inputClass}
        >
          <option value="" disabled>
            選択してください
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.company ? `（${c.company}）` : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">ステータス</span>
        <select
          name="status"
          defaultValue={project?.status ?? "LEAD"}
          className={inputClass}
        >
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">受注金額（税別・円）</span>
        <input
          name="amount"
          type="number"
          min={0}
          defaultValue={project?.amount ?? 0}
          className={inputClass}
        />
        <span className="mt-1.5 flex items-center gap-2 text-sm text-gray-600">
          <input
            name="recurring"
            type="checkbox"
            defaultChecked={project?.recurring ?? false}
            className="size-4 rounded accent-sky-600"
          />
          月額案件（毎月この金額で請求書を発行）
        </span>
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">サイトURL</span>
        <input
          name="siteUrl"
          type="url"
          placeholder="https://"
          defaultValue={project?.siteUrl ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">開始日</span>
        <input
          name="startDate"
          type="date"
          defaultValue={toDateInputValue(project?.startDate)}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">期日（納期）</span>
        <input
          name="dueDate"
          type="date"
          defaultValue={toDateInputValue(project?.dueDate)}
          className={inputClass}
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-sm text-gray-600">案件内容</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={project?.description ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-sm text-gray-600">メモ</span>
        <textarea
          name="notes"
          rows={2}
          defaultValue={project?.notes ?? ""}
          className={inputClass}
        />
      </label>
      <div className="flex gap-3 sm:col-span-2">
        <button
          type="submit"
          className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-medium hover:bg-sky-700"
        >
          保存する
        </button>
        <Link
          href={cancelHref}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
        >
          キャンセル
        </Link>
      </div>
    </form>
  );
}
