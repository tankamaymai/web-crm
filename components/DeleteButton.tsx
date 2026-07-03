"use client";

import { useTransition } from "react";

export default function DeleteButton({
  action,
  label = "削除",
  confirmMessage = "本当に削除しますか？",
  className,
}: {
  action: () => Promise<void>;
  label?: string;
  confirmMessage?: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm(confirmMessage)) {
          startTransition(async () => {
            try {
              await action();
            } catch (e) {
              window.alert(e instanceof Error ? e.message : "削除に失敗しました");
            }
          });
        }
      }}
      className={
        className ??
        "text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
      }
    >
      {label}
    </button>
  );
}
