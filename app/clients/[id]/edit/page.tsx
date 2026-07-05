import { prisma } from "@/lib/prisma";
import { updateClient } from "@/app/actions/clients";
import PageHeader from "@/components/PageHeader";
import TaxModeSelect from "@/components/TaxModeSelect";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClientEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();

  return (
    <div>
      <PageHeader title="顧客を編集" />
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
        <form action={updateClient.bind(null, client.id)} className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-gray-600">顧客名 *</span>
            <input
              name="name"
              required
              defaultValue={client.name}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">会社名</span>
            <input
              name="company"
              defaultValue={client.company ?? ""}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">メールアドレス</span>
            <input
              name="email"
              type="email"
              defaultValue={client.email ?? ""}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">電話番号</span>
            <input
              name="phone"
              defaultValue={client.phone ?? ""}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block col-span-2">
            <span className="text-sm text-gray-600">
              消費税の計算方法（この顧客への請求書のデフォルト）
            </span>
            <TaxModeSelect defaultValue={client.taxMode} />
          </label>
          <label className="block col-span-2">
            <span className="text-sm text-gray-600">メモ</span>
            <textarea
              name="notes"
              rows={2}
              defaultValue={client.notes ?? ""}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="col-span-2 flex gap-3">
            <button
              type="submit"
              className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-medium hover:bg-sky-700"
            >
              保存する
            </button>
            <Link
              href="/clients"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              キャンセル
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
