"use client";

import { useTransition } from "react";

export default function TaskCheckbox({
  checked,
  action,
}: {
  checked: boolean;
  action: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={pending}
      onChange={() => startTransition(() => action())}
      className="size-4 accent-emerald-600 cursor-pointer"
    />
  );
}
