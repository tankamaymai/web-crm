"use client";

import { useState, useTransition } from "react";
import { setInvoiceFormat } from "@/app/actions/invoices";

/** 請求書PDFの書式（アプリ標準 / 取り込んだ書式）をその場で切り替える */
export default function InvoiceFormatSelect({
  invoiceId,
  formatId,
  formats,
}: {
  invoiceId: string;
  formatId: string | null;
  formats: { id: string; name: string }[];
}) {
  const [value, setValue] = useState(formatId ?? "");
  const [pending, startTransition] = useTransition();

  const handleChange = (next: string) => {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      try {
        await setInvoiceFormat(invoiceId, next || null);
      } catch {
        setValue(previous);
        alert("書式を変更できませんでした。もう一度お試しください。");
      }
    });
  };

  return (
    <label className="flex items-center gap-1.5 text-sm text-gray-600">
      <span className="whitespace-nowrap">PDFの書式</span>
      <select
        value={value}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm disabled:opacity-60"
      >
        <option value="">標準</option>
        {formats.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </label>
  );
}
