export const PROJECT_STATUSES = [
  "LEAD",
  "IN_PROGRESS",
  "REVIEW",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  LEAD: "見込み",
  IN_PROGRESS: "進行中",
  REVIEW: "確認待ち",
  DELIVERED: "納品済",
  COMPLETED: "完了",
  CANCELLED: "中止",
};

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  LEAD: "bg-slate-200 text-slate-800",
  IN_PROGRESS: "bg-blue-600 text-white",
  REVIEW: "bg-amber-400 text-amber-950",
  DELIVERED: "bg-violet-600 text-white",
  COMPLETED: "bg-emerald-600 text-white",
  CANCELLED: "bg-gray-200 text-gray-500 line-through",
};

/** 進行中とみなすステータス（ダッシュボード集計・一覧の既定絞り込み用） */
export const ACTIVE_PROJECT_STATUSES = ["LEAD", "IN_PROGRESS", "REVIEW", "DELIVERED"];

export const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID"] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "下書き",
  SENT: "発行済",
  PAID: "入金済",
};

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-200 text-slate-800",
  SENT: "bg-amber-400 text-amber-950",
  PAID: "bg-emerald-600 text-white",
};
