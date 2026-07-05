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
  LEAD: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  REVIEW: "bg-amber-100 text-amber-700",
  DELIVERED: "bg-violet-100 text-violet-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-gray-100 text-gray-400 line-through",
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
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
};
