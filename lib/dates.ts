// 日付は「日付のみ」を UTC 深夜0時の Date として統一的に扱う。
// <input type="date"> の "YYYY-MM-DD" を new Date() すると UTC 0時になるため、
// 表示側も timeZone: "UTC" でフォーマットすればズレない。
// 「今日」はユーザーの生活時間である日本時間 (JST) を基準にする。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 日本時間での「今日」を UTC 深夜0時の Date で返す */
export function todayJST(): Date {
  const now = new Date(Date.now() + JST_OFFSET_MS);
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** 対象日を含む月の開始（UTC 0時） */
export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function addMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)
  );
}

/** "YYYY-MM-DD" (input[type=date] の値) → Date | null */
export function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Date → "YYYY-MM-DD" (input[type=date] の初期値用) */
export function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatMonth(date: Date): string {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

/** 期日までの残り日数（負なら超過） */
export function daysUntil(dueDate: Date): number {
  const today = todayJST();
  return Math.round(
    (dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
  );
}

/** 同じ「日付」か（UTC 0時基準） */
export function isSameDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}
