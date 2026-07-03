import { daysUntil, formatDate } from "@/lib/dates";

/** 期日を表示し、超過は赤・7日以内は橙で強調する */
export default function DueDateLabel({
  dueDate,
  done = false,
}: {
  dueDate: Date | null;
  done?: boolean;
}) {
  if (!dueDate) return <span className="text-gray-400">—</span>;
  const days = daysUntil(dueDate);
  if (done) return <span className="text-gray-500">{formatDate(dueDate)}</span>;
  if (days < 0)
    return (
      <span className="text-red-600 font-medium">
        {formatDate(dueDate)}（{-days}日超過）
      </span>
    );
  if (days === 0)
    return <span className="text-red-500 font-medium">{formatDate(dueDate)}（今日）</span>;
  if (days <= 7)
    return (
      <span className="text-amber-600 font-medium">
        {formatDate(dueDate)}（あと{days}日）
      </span>
    );
  return <span className="text-gray-600">{formatDate(dueDate)}</span>;
}
