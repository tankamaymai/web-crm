"use client";

import { useRef, useState, useTransition } from "react";
import {
  createProjectNote,
  deleteProjectNote,
  toggleProjectNote,
} from "@/app/actions/projectNotes";

export type NoteDto = {
  id: string;
  body: string;
  resolved: boolean;
  createdAt: string; // "M/D" 形式に整形済み
};

function NoteRow({ note }: { note: NoteDto }) {
  const [, startTransition] = useTransition();
  return (
    <li className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-gray-50">
      <button
        type="button"
        onClick={() => startTransition(() => toggleProjectNote(note.id))}
        title={note.resolved ? "未確認に戻す" : "確認済みにする"}
        aria-label={note.resolved ? "未確認に戻す" : "確認済みにする"}
        className={`mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded border-2 transition ${
          note.resolved
            ? "border-gray-300 bg-gray-300 text-white"
            : "border-amber-400 text-transparent hover:text-amber-400"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <p
        className={`min-w-0 flex-1 whitespace-pre-wrap text-sm ${
          note.resolved ? "text-gray-400 line-through" : ""
        }`}
      >
        {note.body}
      </p>
      <span className="shrink-0 pt-0.5 text-xs text-gray-300 tabular-nums">
        {note.createdAt}
      </span>
      <button
        type="button"
        onClick={() => startTransition(() => deleteProjectNote(note.id))}
        className="shrink-0 px-0.5 text-gray-300 opacity-0 hover:text-red-500 group-hover:opacity-100"
        aria-label="削除"
      >
        ✕
      </button>
    </li>
  );
}

export default function ProjectNotes({
  projectId,
  notes,
}: {
  projectId: string;
  notes: NoteDto[];
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const pendingNotes = notes.filter((n) => !n.resolved);
  const resolvedNotes = notes.filter((n) => n.resolved);

  const submit = () => {
    const trimmed = body.trim();
    if (!trimmed || pending) return;
    const formData = new FormData();
    formData.set("body", trimmed);
    startTransition(async () => {
      await createProjectNote(projectId, formData);
      setBody("");
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-bold">💬 確認事項・質問メモ</h2>
        {pendingNotes.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 tabular-nums">
            未確認 {pendingNotes.length}
          </span>
        )}
      </div>

      <form
        ref={formRef}
        action={submit}
        className="mb-3 rounded-lg border border-gray-200 p-2"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            // IME変換中のEnterは無視し、Shift+Enterで追加する
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter" && e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder="先方に聞きたいことをメモ（Shift+Enterで追加）"
          className="w-full resize-y border-0 px-1 py-0.5 text-sm outline-none"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-40"
          >
            {pending ? "追加中..." : "追加"}
          </button>
        </div>
      </form>

      {pendingNotes.length === 0 && resolvedNotes.length === 0 && (
        <p className="text-sm text-gray-400">
          実装中に出てきた質問をためておいて、まとめて先方に確認できます。
        </p>
      )}

      <ul className="space-y-0.5">
        {pendingNotes.map((note) => (
          <NoteRow key={note.id} note={note} />
        ))}
      </ul>

      {resolvedNotes.length > 0 && (
        <details className="mt-3 border-t border-gray-100 pt-2">
          <summary className="cursor-pointer text-xs font-medium text-gray-400">
            確認済み（{resolvedNotes.length}件）
          </summary>
          <ul className="mt-1 space-y-0.5">
            {resolvedNotes.map((note) => (
              <NoteRow key={note.id} note={note} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
