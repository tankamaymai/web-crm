import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import InvoiceTemplateManager, {
  type TemplateDto,
} from "@/components/InvoiceTemplateManager";
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
        description="登録したテンプレートは、請求書の新規作成画面で明細としてまとめて追加できます。"
        back={{ href: "/invoices", label: "請求書一覧" }}
      />
      <div className="max-w-3xl">
        <InvoiceTemplateManager templates={dtos} />
      </div>
    </div>
  );
}
