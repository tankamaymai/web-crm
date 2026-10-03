"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  importDocumentFormat,
  type ImportFormatState,
} from "@/app/actions/documentFormats";

/** PDFをアップロードしてAIに書式を読み取らせるフォーム */
export default function DocumentFormatUploader({
  hasApiKey,
}: {
  hasApiKey: boolean;
}) {
  const [state, formAction, pending] = useActionState<ImportFormatState, FormData>(
    importDocumentFormat,
    {}
  );

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <h2 className="font-semibold">PDFから自動で取り込む</h2>
      <p className="text-sm text-gray-500">
        使いたい請求書のPDFを選ぶと、AIがレイアウト・色・項目名を読み取って書式として登録します。
        宛先・明細・金額などの中身は、このアプリの請求書データが入ります。
      </p>
      {!hasApiKey && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          自動取り込みには Claude のAPIキーが必要です。
          <Link href="/settings#ai" className="font-medium underline">
            設定画面
          </Link>
          で登録してください（未登録でも、下の「貼り付けで登録」は使えます）。
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-gray-600">PDFファイル（5MBまで）</span>
          <input
            type="file"
            name="file"
            accept="application/pdf,.pdf"
            required
            disabled={pending || !hasApiKey}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm hover:file:bg-gray-200"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-gray-600">書式の名前（省略可）</span>
          <input
            type="text"
            name="name"
            placeholder="例: A社指定の請求書"
            disabled={pending || !hasApiKey}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || !hasApiKey}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {pending ? "AIが読み取り中…（1分ほどかかります）" : "取り込む"}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {!pending && state.createdId && (
          <p className="text-sm text-emerald-700">
            取り込みました。下の一覧からプレビューで仕上がりを確認できます。
          </p>
        )}
      </div>
    </form>
  );
}
