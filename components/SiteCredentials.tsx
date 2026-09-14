"use client";

import { useState, useTransition } from "react";
import {
  createSiteCredential,
  deleteSiteCredential,
  updateSiteCredential,
} from "@/app/actions/siteCredentials";

export type CredentialDto = {
  id: string;
  label: string;
  url: string | null;
  loginId: string | null;
  password: string | null;
  note: string | null;
};

// よく使うラベルの候補（自由入力もできる）
const LABEL_SUGGESTIONS = [
  "テストサイト",
  "本番サイト",
  "WordPress管理画面",
  "サーバー管理画面",
  "FTP",
  "ドメイン管理",
  "Googleアナリティクス",
];

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          // クリップボードが使えない環境では何もしない
        }
      }}
      title={`${label}をコピー`}
      aria-label={`${label}をコピー`}
      className={`shrink-0 rounded px-1.5 py-0.5 text-xs transition-colors ${
        copied
          ? "bg-emerald-100 text-emerald-700"
          : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
      }`}
    >
      {copied ? "コピー済" : "コピー"}
    </button>
  );
}

/** ラベル + 値 + コピーボタンの1行 */
function Field({
  label,
  value,
  mono,
  secret,
}: {
  label: string;
  value: string;
  mono?: boolean;
  secret?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const shown = secret && !revealed ? "•".repeat(Math.min(value.length, 12)) : value;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-16 shrink-0 text-xs text-gray-400">{label}</span>
      <span
        className={`min-w-0 flex-1 truncate ${mono ? "font-mono text-xs" : ""}`}
      >
        {shown}
      </span>
      {secret && (
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="shrink-0 rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          {revealed ? "隠す" : "表示"}
        </button>
      )}
      <CopyButton value={value} label={label} />
    </div>
  );
}

function CredentialForm({
  credential,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  credential?: CredentialDto;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const inputClass =
    "w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm";
  return (
    <form action={onSubmit} className="space-y-2 rounded-lg border border-sky-200 bg-sky-50/50 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-gray-500">ラベル *</span>
          <input
            name="label"
            required
            list="credential-labels"
            defaultValue={credential?.label}
            placeholder="テストサイト"
            className={inputClass}
          />
          <datalist id="credential-labels">
            {LABEL_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">URL</span>
          <input
            name="url"
            type="url"
            defaultValue={credential?.url ?? ""}
            placeholder="https://"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">ID・ユーザー名</span>
          <input
            name="loginId"
            defaultValue={credential?.loginId ?? ""}
            autoComplete="off"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">パスワード</span>
          <input
            name="password"
            defaultValue={credential?.password ?? ""}
            autoComplete="off"
            className={inputClass}
          />
        </label>
      </div>
      <label className="block">
        <span className="text-xs text-gray-500">メモ（BASIC認証など）</span>
        <input
          name="note"
          defaultValue={credential?.note ?? ""}
          className={inputClass}
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

function CredentialRow({ credential }: { credential: CredentialDto }) {
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  if (editing) {
    return (
      <li>
        <CredentialForm
          credential={credential}
          submitLabel="保存する"
          onCancel={() => setEditing(false)}
          onSubmit={(formData) => {
            startTransition(async () => {
              await updateSiteCredential(credential.id, formData);
              setEditing(false);
            });
          }}
        />
      </li>
    );
  }

  return (
    <li className="group rounded-lg border border-gray-100 p-3 hover:border-gray-200 hover:bg-gray-50/70">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
          {credential.label}
        </span>
        <div className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            編集
          </button>
          <button
            type="button"
            onClick={() => {
              if (!window.confirm(`「${credential.label}」を削除しますか？`)) return;
              startTransition(() => deleteSiteCredential(credential.id));
            }}
            className="rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-red-50 hover:text-red-500"
          >
            削除
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {credential.url && (
          <div className="flex items-center gap-2 text-sm">
            <span className="w-16 shrink-0 text-xs text-gray-400">URL</span>
            <a
              href={credential.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-sky-700 hover:underline"
            >
              {credential.url}
            </a>
            <CopyButton value={credential.url} label="URL" />
          </div>
        )}
        {credential.loginId && (
          <Field label="ID" value={credential.loginId} mono />
        )}
        {credential.password && (
          <Field label="パスワード" value={credential.password} mono secret />
        )}
        {credential.note && (
          <p className="pt-0.5 text-xs text-gray-500">{credential.note}</p>
        )}
      </div>
    </li>
  );
}

export default function SiteCredentials({
  projectId,
  credentials,
}: {
  projectId: string;
  credentials: CredentialDto[];
}) {
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold">🔑 サイト情報</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            + 追加
          </button>
        )}
      </div>

      {credentials.length === 0 && !adding && (
        <p className="text-sm text-gray-400">
          テストサイトや本番サイトのURL・ID・パスワードをここにまとめておけます。
        </p>
      )}

      <ul className="space-y-2">
        {credentials.map((credential) => (
          <CredentialRow key={credential.id} credential={credential} />
        ))}
      </ul>

      {adding && (
        <div className="mt-2">
          <CredentialForm
            submitLabel="追加する"
            onCancel={() => setAdding(false)}
            onSubmit={(formData) => {
              startTransition(async () => {
                await createSiteCredential(projectId, formData);
                setAdding(false);
              });
            }}
          />
        </div>
      )}
    </div>
  );
}
