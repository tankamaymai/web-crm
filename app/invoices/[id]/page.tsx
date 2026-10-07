import { prisma } from "@/lib/prisma";
import {
  addProjectsToInvoice,
  deleteInvoice,
  setInvoiceStatus,
  updateInvoice,
} from "@/app/actions/invoices";
import {
  HONORIFICS,
  recipientLabel,
} from "@/lib/invoice";
import { formatDate, formatYen, toDateInputValue } from "@/lib/dates";
import PageHeader from "@/components/PageHeader";
import CelebrateButton from "@/components/CelebrateButton";
import SaveAsTemplateButton from "@/components/SaveAsTemplateButton";
import DeleteButton from "@/components/DeleteButton";
import TaxModeSelect from "@/components/TaxModeSelect";
import InvoiceFormatSelect from "@/components/InvoiceFormatSelect";
import InvoiceEditor from "@/components/invoice-editor/InvoiceEditor";
import { normalizeOverrides } from "@/lib/invoiceDoc/overrides";
import { normalizeLayout, STANDARD_LAYOUT } from "@/lib/documentFormat";
import { getSettings } from "@/lib/settings";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const INVOICE_STEPS = [
  { key: "DRAFT", label: "下書き" },
  { key: "SENT", label: "発行済" },
  { key: "PAID", label: "入金済" },
];

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      items: {
        orderBy: { sortOrder: "asc" },
        include: { project: { select: { id: true, title: true } } },
      },
      format: true,
    },
  });
  if (!invoice) notFound();
  const settings = await getSettings();
  const layout = invoice.format
    ? normalizeLayout(invoice.format.layout)
    : STANDARD_LAYOUT;

  const formats = await prisma.documentFormat.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });

  // 宛先顧客の案件（明細の紐付け先候補）
  const clientProjects = await prisma.project.findMany({
    where: { clientId: invoice.clientId, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, amount: true },
  });
  const linkedProjectIds = new Set(
    invoice.items.map((item) => item.projectId).filter(Boolean)
  );
  const linkedProjects = [
    ...new Map(
      invoice.items
        .filter((item) => item.project)
        .map((item) => [item.project!.id, item.project!])
    ).values(),
  ];
  const addableProjects = clientProjects.filter(
    (p) => !linkedProjectIds.has(p.id)
  );

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm";

  return (
    <div>
      <PageHeader
        title={`請求書 ${invoice.invoiceNumber}`}
        description={recipientLabel(invoice.client, invoice.honorific)}
        back={{ href: "/invoices", label: "請求書一覧" }}
        action={
          <div className="flex flex-wrap gap-2 items-center">
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              📄 PDFを開く
            </a>
            {formats.length > 0 && (
              <InvoiceFormatSelect
                invoiceId={invoice.id}
                formatId={invoice.formatId}
                formats={formats}
              />
            )}
            <SaveAsTemplateButton
              invoiceId={invoice.id}
              defaultName={
                invoice.items[0]?.description ?? invoice.invoiceNumber
              }
            />
            <DeleteButton
              action={deleteInvoice.bind(null, invoice.id)}
              confirmMessage={`請求書 ${invoice.invoiceNumber} を削除しますか？`}
            />
          </div>
        }
      />

      {/* 進み具合: 下書き → 発行済 → 入金済。次にやることのボタンをここに集める */}
      <div className="card mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <ol className="flex items-center gap-2 text-sm">
          {INVOICE_STEPS.map((step, i) => {
            const current = INVOICE_STEPS.findIndex((s) => s.key === invoice.status);
            const done = i < current;
            const active = i === current;
            return (
              <li key={step.key} className="flex items-center gap-2">
                {i > 0 && (
                  <span
                    className={`h-0.5 w-6 sm:w-10 ${done || active ? "bg-sky-600" : "bg-gray-300"}`}
                  />
                )}
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? "bg-sky-600 text-white"
                      : active
                        ? "bg-sky-600 text-white ring-4 ring-sky-200"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span
                  className={
                    active ? "font-bold text-gray-900" : done ? "text-gray-700" : "text-gray-500"
                  }
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap items-center gap-3">
          {invoice.status === "DRAFT" && (
            <>
              <p className="text-sm text-gray-600">内容を確認して先方に送ったら →</p>
              <form action={setInvoiceStatus.bind(null, invoice.id, "SENT")}>
                <button type="submit" className="btn-primary">
                  発行済みにする
                </button>
              </form>
            </>
          )}
          {invoice.status === "SENT" && (
            <>
              <p className="text-sm text-gray-600">入金を確認したら →</p>
              <form action={setInvoiceStatus.bind(null, invoice.id, "PAID")}>
                <CelebrateButton className="btn-success">入金済みにする</CelebrateButton>
              </form>
            </>
          )}
          {invoice.status === "PAID" && (
            <p className="text-sm font-semibold text-emerald-700">
              🎉 入金済みです{invoice.paidAt ? `（${formatDate(invoice.paidAt)}）` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <InvoiceEditor
            invoiceId={invoice.id}
            invoice={{
              invoiceNumber: invoice.invoiceNumber,
              issueDate: invoice.issueDate,
              dueDate: invoice.dueDate,
              taxRate: invoice.taxRate,
              taxMode: invoice.taxMode,
              honorific: invoice.honorific,
              notes: invoice.notes,
              client: { name: invoice.client.name, company: invoice.client.company },
              items: invoice.items.map((item) => ({
                id: item.id,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              })),
            }}
            // パスワード等を含む設定全体はブラウザに渡さず、請求書に載せる項目だけ渡す
            issuer={{
              businessName: settings.businessName,
              postalCode: settings.postalCode,
              address: settings.address,
              phone: settings.phone,
              email: settings.email,
              registrationNumber: settings.registrationNumber,
              bankInfo: settings.bankInfo,
            }}
            layout={layout}
            overrides={normalizeOverrides(invoice.docOverrides)}
            pdfHref={`/api/invoices/${invoice.id}/pdf`}
            xlsxHref={`/api/invoices/${invoice.id}/xlsx`}
          />
              {addableProjects.length > 0 && (
                <form
                  action={addProjectsToInvoice.bind(null, invoice.id)}
                  className="card border-sky-200 bg-sky-50/60 p-4"
                >
                  <p className="mb-2 text-sm font-medium text-sky-900">
                    この顧客の他の案件をまとめて明細に追加
                  </p>
                  <ul className="mb-2 space-y-1">
                    {addableProjects.map((p) => (
                      <li key={p.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-white/70">
                          <input
                            type="checkbox"
                            name="projectIds"
                            value={p.id}
                            className="size-4 accent-sky-600"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {p.title}
                          </span>
                          <span className="tabular-nums text-gray-600">
                            {formatYen(
                              Math.round(
                                (p.amount * (100 + invoice.taxRate)) / 100
                              )
                            )}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="submit"
                    className="btn-primary px-3 py-1.5"
                  >
                    選んだ案件を明細に追加
                  </button>
                </form>
              )}
        </div>

        <div className="space-y-6">
          <div className="card p-6 text-sm">
            <h2 className="font-bold mb-4">請求情報</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-gray-500">宛先</dt>
                <dd className="font-medium">
                  {recipientLabel(invoice.client, invoice.honorific)}
                </dd>
              </div>
              {linkedProjects.length > 0 && (
                <div>
                  <dt className="text-gray-500">
                    関連案件
                    {linkedProjects.length > 1 && (
                      <span className="ml-1.5 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                        {linkedProjects.length}件をまとめて請求
                      </span>
                    )}
                  </dt>
                  <dd className="mt-0.5 space-y-0.5">
                    {linkedProjects.map((p) => (
                      <Link
                        key={p.id}
                        href={`/projects/${p.id}`}
                        className="block text-sky-700 hover:underline"
                      >
                        {p.title}
                      </Link>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="card p-6">
            <h2 className="font-bold mb-4 text-sm">編集</h2>
            <form
              // プレビュー側で日付や備考を書き換えたら、こちらの入力欄も最新の値に作り直す
              key={invoice.updatedAt.toISOString()}
              action={updateInvoice.bind(null, invoice.id)}
              className="space-y-3"
            >
              <label className="block">
                <span className="text-sm text-gray-600">宛名の敬称</span>
                <select
                  name="honorific"
                  defaultValue={invoice.honorific}
                  className={inputClass}
                >
                  {HONORIFICS.map((h) => (
                    <option key={h} value={h}>
                      {h}（{recipientLabel(invoice.client, h)}）
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-gray-600">発行日</span>
                <input
                  name="issueDate"
                  type="date"
                  defaultValue={toDateInputValue(invoice.issueDate)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-600">支払期限</span>
                <input
                  name="dueDate"
                  type="date"
                  defaultValue={toDateInputValue(invoice.dueDate)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-600">消費税率（%）</span>
                <input
                  name="taxRate"
                  type="number"
                  min={0}
                  defaultValue={invoice.taxRate}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-600">消費税の計算方法</span>
                <TaxModeSelect defaultValue={invoice.taxMode} />
              </label>
              <label className="block">
                <span className="text-sm text-gray-600">備考</span>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={invoice.notes ?? ""}
                  className={inputClass}
                />
              </label>
              <button
                type="submit"
                className="btn-primary"
              >
                保存する
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
