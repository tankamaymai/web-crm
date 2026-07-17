import { prisma } from "@/lib/prisma";
import { createClient, deleteClient } from "@/app/actions/clients";
import { TAX_MODE_SHORT_LABELS } from "@/lib/invoice";
import PageHeader from "@/components/PageHeader";
import DeleteButton from "@/components/DeleteButton";
import TaxModeSelect from "@/components/TaxModeSelect";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { projects: true } } },
  });

  return (
    <div>
      <PageHeader title="顧客" />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto mb-8">
        <table className="w-full min-w-[720px] whitespace-nowrap text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">顧客名</th>
              <th className="px-4 py-3 font-medium">会社名</th>
              <th className="px-4 py-3 font-medium">メール</th>
              <th className="px-4 py-3 font-medium">電話</th>
              <th className="px-4 py-3 font-medium">消費税計算</th>
              <th className="px-4 py-3 font-medium text-right">案件数</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  顧客がまだ登録されていません。下のフォームから登録してください。
                </td>
              </tr>
            )}
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{client.name}</td>
                <td className="px-4 py-3 text-gray-600">{client.company ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{client.email ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{client.phone ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">
                  {client.taxMode === "STANDARD" ? (
                    TAX_MODE_SHORT_LABELS[client.taxMode]
                  ) : (
                    <span className="inline-block rounded-full bg-orange-100 text-orange-700 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
                      {TAX_MODE_SHORT_LABELS[client.taxMode] ?? client.taxMode}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">{client._count.projects}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link
                    href={`/clients/${client.id}/edit`}
                    className="text-sm text-sky-600 hover:underline mr-3"
                  >
                    編集
                  </Link>
                  <DeleteButton
                    action={deleteClient.bind(null, client.id)}
                    confirmMessage={`「${client.name}」を削除しますか？`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
        <h2 className="font-bold mb-4">新規顧客を登録</h2>
        <form action={createClient} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-gray-600">顧客名 *</span>
            <input
              name="name"
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">会社名</span>
            <input
              name="company"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">メールアドレス</span>
            <input
              name="email"
              type="email"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">電話番号</span>
            <input
              name="phone"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-gray-600">
              消費税の計算方法（この顧客への請求書のデフォルト）
            </span>
            <TaxModeSelect />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-gray-600">メモ</span>
            <textarea
              name="notes"
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-medium hover:bg-sky-700"
            >
              登録する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
