import {
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
} from "@/lib/status";

export function ProjectStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${
        PROJECT_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {PROJECT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${
        INVOICE_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {INVOICE_STATUS_LABELS[status] ?? status}
    </span>
  );
}
