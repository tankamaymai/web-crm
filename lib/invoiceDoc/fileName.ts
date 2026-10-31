// 請求書をダウンロードするときのファイル名。
// 取引先名には改行・制御文字・OSで使えない記号が入りうるので、ここで必ず取り除く。

/** ファイル名やPDFのタイトルに使えない文字を取り除く */
export function sanitizeFileNamePart(text: string): string {
  return (
    text
      .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028\u2029\ufeff]/g, " ")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      // 先頭のドットは隠しファイル扱いになるので外す
      .replace(/^\.+/, "")
      .slice(0, 60)
  );
}

/** 「取引先名 御請求書 ◯月分.pdf」（月は発行日の月） */
export function invoiceFileName(
  invoice: {
    issueDate: Date;
    client: { name: string; company: string | null };
  },
  ext: "pdf" | "xlsx"
): string {
  const client = sanitizeFileNamePart(invoice.client.company || invoice.client.name) || "請求書";
  const month = invoice.issueDate.getUTCMonth() + 1;
  return `${client} 御請求書 ${month}月分.${ext}`;
}

/**
 * Content-Disposition ヘッダー。日本語名は filename* で渡し、
 * 古いブラウザ向けに英数字だけの名前（請求書番号）も添える。
 */
export function contentDisposition(
  type: "inline" | "attachment",
  asciiName: string,
  fileName: string
): string {
  const ascii = asciiName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
