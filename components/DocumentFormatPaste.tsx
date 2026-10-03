"use client";

import { useActionState, useState } from "react";
import {
  importDocumentFormatFromText,
  type ImportFormatState,
} from "@/app/actions/documentFormats";
import { FORMAT_CHAT_PROMPT } from "@/lib/ai/formatPrompt";

/**
 * APIキー無しで書式を登録する方法。
 * 依頼文をコピー → claude.ai などにPDFと一緒に送る → 返ってきたJSONを貼り付ける。
 */
export default function DocumentFormatPaste() {
  const [state, formAction, pending] = useActionState<ImportFormatState, FormData>(
    importDocumentFormatFromText,
    {}
  );
  const [copied, setCopied] = useState(false);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(FORMAT_CHAT_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("コピーできませんでした。");
    }
  };

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <h2 className="font-semibold">貼り付けで登録（APIキー不要）</h2>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-600">
        <li>
          <button
            type="button"
            onClick={copyPrompt}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50"
          >
            {copied ? "✓ コピーしました" : "📋 AIへの依頼文をコピー"}
          </button>
        </li>
        <li>
          <a
            href="https://claude.ai/new"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-700 underline"
          >
            Claude
          </a>
          などのAIチャットを開き、請求書のPDFを添付して、コピーした依頼文を貼り付けて送信
        </li>
        <li>AIの返答（{"{"} から {"}"} まで）をコピーして、下に貼り付け</li>
      </ol>
      <textarea
        name="json"
        rows={6}
        required
        disabled={pending}
        placeholder='{ "documentTitle": "御請求書", ... }'
        className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs"
      />
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          name="name"
          placeholder="書式の名前（省略可）"
          disabled={pending}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {pending ? "登録中…" : "登録する"}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {!pending && state.createdId && (
        <p className="text-sm text-emerald-700">
          登録しました。下の一覧からプレビューで仕上がりを確認できます。
        </p>
      )}
    </form>
  );
}
