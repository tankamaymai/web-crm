import { getSettings } from "@/lib/settings";
import { updateSettings } from "@/app/actions/settings";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm";

  return (
    <div>
      <PageHeader title="設定" />
      <p className="text-sm text-gray-500 mb-6 -mt-3">
        ここで設定した内容が請求書PDFに印字されます。
      </p>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
        <form action={updateSettings} className="grid grid-cols-2 gap-4">
          <label className="block col-span-2">
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
          <label className="block col-span-2">
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
          <label className="block col-span-2">
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
          <div className="block">
            <span className="text-sm text-gray-600">支払期限</span>
            <p className="mt-1 text-sm text-gray-500 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              請求書の支払期限は「発行月の翌月末日」で自動設定されます。
            </p>
          </div>
          <label className="block col-span-2">
            <span className="text-sm text-gray-600">請求書の備考（デフォルト）</span>
            <textarea
              name="invoiceNotes"
              rows={2}
              defaultValue={settings.invoiceNotes ?? ""}
              className={inputClass}
            />
          </label>
          <div className="col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-medium hover:bg-sky-700"
            >
              保存する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
