import { fixHistoricalPaidInvoiceDates } from "@/app/actions/admin";
import PageHeader from "@/components/PageHeader";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FixDatesPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; skipped?: string }>;
}) {
  const { updated, skipped } = await searchParams;

  async function runFix() {
    "use server";
    const result = await fixHistoricalPaidInvoiceDates();
    const params = new URLSearchParams({
      updated: String(result.updated),
      skipped: result.skipped.join(","),
    });
    redirect(`/admin/fix-dates?${params.toString()}`);
  }

  return (
    <div>
      <PageHeader title="過去データの日付修正（一時ツール）" />
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl space-y-4">
        <p className="text-sm text-gray-600">
          入金済み（ステータス「入金済」）の請求書について、発行日・入金日を
          <strong>紐づく案件の期限（期日）</strong>
          に一括で合わせ直します。過去の案件をまとめて登録した際に発行日が
          すべて「登録した当日」になってしまった問題を修正するためのものです。
        </p>
        <p className="text-sm text-amber-600">
          この操作は元に戻せません。案件に期日が設定されていない請求書はスキップされます（後で個別に修正してください）。
        </p>

        <form action={runFix}>
          <button
            type="submit"
            className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700"
          >
            入金済み請求書の日付を案件の期限に合わせて修正する
          </button>
        </form>

        {updated !== undefined && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <p className="font-medium text-emerald-800">
              {updated}件の請求書を修正しました。
            </p>
            {skipped && skipped.length > 0 && (
              <p className="mt-2 text-amber-700">
                以下は案件に期日が未設定のためスキップされました: {skipped}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
