import { getSettings } from "@/lib/settings";
import { updateSettings } from "@/app/actions/settings";
import { changePassword } from "@/app/actions/auth";
import PageHeader from "@/components/PageHeader";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PASSWORD_MESSAGES: Record<string, { text: string; ok?: boolean }> = {
  done: { text: "パスワードを変更しました", ok: true },
  wrong: { text: "現在のパスワードが違います" },
  short: { text: "新しいパスワードは6文字以上にしてください" },
  mismatch: { text: "確認用のパスワードが一致しません" },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ pw?: string }>;
}) {
  await requireAuth();
  const { pw } = await searchParams;
  const passwordMessage = pw ? PASSWORD_MESSAGES[pw] : undefined;
  const settings = await getSettings();
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm";

  return (
    <div>
      <PageHeader title="設定" />
      <p className="text-sm text-gray-500 mb-6 -mt-3">
        事業者情報は請求書PDFに印字されます。月次売上目標はダッシュボードのゲージに反映されます。
      </p>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
        <form action={updateSettings} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm text-gray-600">事業者名・屋号 *</span>
            <input
              name="businessName"
              required
              defaultValue={settings.businessName}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">郵便番号</span>
            <input
              name="postalCode"
              placeholder="100-0001"
              defaultValue={settings.postalCode ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">住所</span>
            <input
              name="address"
              defaultValue={settings.address ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">電話番号</span>
            <input
              name="phone"
              defaultValue={settings.phone ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">メールアドレス</span>
            <input
              name="email"
              type="email"
              defaultValue={settings.email ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-gray-600">
              適格請求書発行事業者 登録番号（インボイス）
            </span>
            <input
              name="registrationNumber"
              placeholder="T1234567890123"
              defaultValue={settings.registrationNumber ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-gray-600">振込先（銀行口座情報）</span>
            <textarea
              name="bankInfo"
              rows={3}
              placeholder={"○○銀行 △△支店\n普通 1234567\nヤマダ タロウ"}
              defaultValue={settings.bankInfo ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">デフォルト消費税率（%）</span>
            <input
              name="defaultTaxRate"
              type="number"
              min={0}
              defaultValue={settings.defaultTaxRate}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">月次売上目標（税込・円）</span>
            <input
              name="monthlyGoal"
              type="number"
              min={0}
              step={10000}
              placeholder="500000"
              defaultValue={settings.monthlyGoal || ""}
              className={inputClass}
            />
          </label>
          <div className="block">
            <span className="text-sm text-gray-600">支払期限</span>
            <p className="mt-1 text-sm text-gray-500 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              請求書の支払期限は「発行月の翌月末日」で自動設定されます。
            </p>
          </div>
          <label className="block sm:col-span-2">
            <span className="text-sm text-gray-600">請求書の備考（デフォルト）</span>
            <textarea
              name="invoiceNotes"
              rows={2}
              defaultValue={settings.invoiceNotes ?? ""}
              className={inputClass}
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-medium hover:bg-sky-700"
            >
              保存する
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
        <h2 className="font-bold">🔒 ログインパスワードの変更</h2>
        <p className="mt-1 text-sm text-gray-500">
          変更すると、ログイン中の他の端末は再ログインが必要になります。
        </p>
        <form
          action={changePassword}
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <label className="block sm:col-span-2">
            <span className="text-sm text-gray-600">現在のパスワード</span>
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">新しいパスワード</span>
            <input
              name="newPassword"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">確認のためもう一度</span>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClass}
            />
          </label>
          {passwordMessage && (
            <p
              className={`sm:col-span-2 rounded-lg px-3 py-2 text-sm ${
                passwordMessage.ok
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {passwordMessage.text}
            </p>
          )}
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              パスワードを変更する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
