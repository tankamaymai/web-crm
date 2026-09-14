import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import InvoiceTemplateManager, {
  type TemplateDto,
} from "@/components/InvoiceTemplateManager";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function InvoiceTemplatesPage() {
  await requireAuth();
  const templates = await prisma.invoiceTemplate.findMany({
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  const dtos: TemplateDto[] = templates.map((t) => ({
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
        title="請求書テンプレート"
        action={
          <Link
            href="/invoices"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
          >
            請求書一覧へ
          </Link>
        }
      />
      <p className="-mt-3 mb-6 text-sm text-gray-500">
        登録したテンプレートは、請求書の新規作成画面で明細としてまとめて追加できます。
      </p>
      <div className="max-w-3xl">
        <InvoiceTemplateManager templates={dtos} />
      </div>
    </div>
  );
}
