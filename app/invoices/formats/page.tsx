import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import DocumentFormatUploader from "@/components/DocumentFormatUploader";
import DeleteButton from "@/components/DeleteButton";
import {
  deleteDocumentFormat,
  renameDocumentFormat,
} from "@/app/actions/documentFormats";
import { formatDate } from "@/lib/dates";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
// AIでのPDF読み取りに時間がかかるため、このページのServer Actionの上限を延ばす
export const maxDuration = 300;

export default async function DocumentFormatsPage() {
  await requireAuth();
  const formats = await prisma.documentFormat.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { invoices: true } } },
  });

  return (
    <div>
      <PageHeader
        title="請求書の書式"
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
        取り込んだ書式は、請求書の詳細画面の「PDFの書式」で選べます。同じ取引先の次の請求書にも引き継がれます。
      </p>

      <div className="max-w-3xl space-y-6">
        <DocumentFormatUploader />

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <h2 className="border-b border-gray-100 px-5 py-3 font-semibold">
            登録済みの書式
          </h2>
          {formats.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-500">
              まだ書式がありません。上のフォームからPDFを取り込んでください。
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {formats.map((f) => (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3"
                >
                  <form
                    action={renameDocumentFormat.bind(null, f.id)}
                    className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-1"
                  >
                    <input
                      name="name"
                      defaultValue={f.name}
                      aria-label="書式の名前"
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    />
                    <button
                      type="submit"
                      className="shrink-0 whitespace-nowrap rounded-lg border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
                    >
                      名前を保存
                    </button>
                  </form>
                  <span className="flex-1 text-xs text-gray-500 sm:flex-none">
                    {formatDate(f.createdAt)}登録・使用中 {f._count.invoices}件
                  </span>
                  <a
                    href={`/api/document-formats/${f.id}/preview`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs hover:bg-gray-50"
                  >
                    📄 プレビュー
                  </a>
                  <DeleteButton
                    action={deleteDocumentFormat.bind(null, f.id)}
                    confirmMessage={`書式「${f.name}」を削除しますか？使用中の請求書は標準の書式に戻ります。`}
                    className="text-xs text-red-600 hover:underline"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
