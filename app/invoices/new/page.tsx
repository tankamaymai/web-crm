import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { endOfNextMonth, toDateInputValue, todayJST } from "@/lib/dates";
import { PROJECT_STATUS_LABELS } from "@/lib/status";
import PageHeader from "@/components/PageHeader";
import InvoiceComposer, {
  type ComposerClient,
  type ComposerProject,
  type ComposerTemplate,
} from "@/components/InvoiceComposer";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  await requireAuth();
  const today = todayJST();
  const [settings, clients, projects, templates] = await Promise.all([
    getSettings(),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({
      where: { status: { notIn: ["CANCELLED"] } },
      orderBy: [{ createdAt: "desc" }],
      include: { _count: { select: { invoiceItems: true } } },
    }),
    prisma.invoiceTemplate.findMany({
      orderBy: { sortOrder: "asc" },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  const composerClients: ComposerClient[] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
    taxMode: c.taxMode,
  }));

  const composerProjects: ComposerProject[] = projects.map((p) => ({
    id: p.id,
    clientId: p.clientId,
    title: p.title,
    amount: p.amount,
    statusLabel: PROJECT_STATUS_LABELS[p.status] ?? p.status,
    billed: p._count.invoiceItems > 0,
  }));

  const composerTemplates: ComposerTemplate[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    notes: t.notes,
    taxMode: t.taxMode,
    items: t.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  }));

  return (
    <div>
      <PageHeader
        title="請求書を作成"
        action={
          <Link
            href="/invoices/templates"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
          >
            📄 テンプレート管理
          </Link>
        }
      />

      {clients.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
          先に顧客を登録してください。
          <Link href="/clients" className="ml-2 text-sky-600 hover:underline">
            顧客登録へ
          </Link>
        </div>
      ) : (
        <InvoiceComposer
          clients={composerClients}
          projects={composerProjects}
          templates={composerTemplates}
          defaultTaxRate={settings.defaultTaxRate}
          todayStr={toDateInputValue(today)}
          defaultDueDateStr={toDateInputValue(endOfNextMonth(today))}
          defaultNotes={settings.invoiceNotes ?? ""}
        />
      )}
    </div>
  );
}
