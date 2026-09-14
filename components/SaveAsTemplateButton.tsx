"use client";

import { useState, useTransition } from "react";
import { saveInvoiceAsTemplate } from "@/app/actions/invoiceTemplates";

export default function SaveAsTemplateButton({
  invoiceId,
  defaultName,
}: {
  invoiceId: string;
  defaultName: string;
}) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  if (saved) {
    return (
      <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        テンプレートに保存しました
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
      >
        📄 テンプレートとして保存
      </button>
    );
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          await saveInvoiceAsTemplate(invoiceId, formData);
          setOpen(false);
          setSaved(true);
        })
      }
      className="flex flex-wrap items-center gap-2"
    >
      <input
        name="name"
        required
        autoFocus
        defaultValue={defaultName}
        placeholder="テンプレート名"
        className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-40"
      >
        {pending ? "保存中..." : "保存"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-lg px-2 py-2 text-sm text-gray-500 hover:bg-gray-100"
      >
        キャンセル
      </button>
    </form>
  );
}
