"use client";

import { useState, type ReactNode } from "react";

// MacのChromeでは、ダウンロードしたファイルが「.com.google.Chrome.XXXXXX」という
// 隠しファイルのまま残り、開けなくなることがある（Chrome側の不具合）。
// 対応しているブラウザでは、Chromeのダウンロード機能を使わず
// 「保存先を選ぶ画面」から直接ファイルを書き込む。非対応のブラウザでは通常のダウンロード。

type SaveFilePicker = (options: {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}) => Promise<{
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
}>;

export default function FileSaveButton({
  href,
  fileName,
  mimeType,
  description,
  className,
  disabled,
  children,
}: {
  href: string;
  fileName: string;
  mimeType: string;
  description: string;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  const save = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker })
      .showSaveFilePicker;
    if (!picker) return; // 非対応: リンクのまま通常のダウンロード
    e.preventDefault();
    const ext = fileName.slice(fileName.lastIndexOf("."));
    let handle;
    try {
      // 保存先の画面はクリック直後に開く必要があるので、ファイルの取得より先に出す
      handle = await picker({
        suggestedName: fileName,
        types: [{ description, accept: { [mimeType]: [ext] } }],
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return; // キャンセル
      window.location.href = href; // 保存先の画面が使えないときは通常のダウンロード
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(href, { credentials: "same-origin", cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
    } catch {
      alert("保存できませんでした。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <a
      href={href}
      download={fileName}
      onClick={save}
      aria-disabled={disabled || busy}
      className={`${className ?? ""} ${disabled || busy ? "pointer-events-none opacity-50" : ""}`}
    >
      {busy ? "保存中…" : children}
    </a>
  );
}
