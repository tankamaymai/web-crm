import Link from "next/link";

export default function PageHeader({
  title,
  description,
  action,
  back,
}: {
  title: string;
  /** 一覧などへ戻るリンク（詳細画面で使う） */
  back?: { href: string; label: string };
  /** タイトル下の一言説明（この画面で何ができるか） */
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:underline"
          >
            ← {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-[28px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
