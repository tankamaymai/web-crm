import { getSettings } from "@/lib/settings";
import {
  deleteAnthropicApiKey,
  saveAnthropicApiKey,
  updateSettings,
} from "@/app/actions/settings";
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

const AI_KEY_MESSAGES: Record<string, { text: string; ok?: boolean }> = {
  saved: { text: "APIキーを登録しました", ok: true },
  deleted: { text: "APIキーを削除しました", ok: true },
  format: { text: "APIキーは sk-ant- で始まる文字列です" },
  invalid: { text: "このAPIキーは使えませんでした。コピー漏れがないか確認してください" },
  unreachable: { text: "APIキーを確認できませんでした。時間をおいてもう一度お試しください" },
};

/** 画面に出すのは先頭と末尾だけ（キー全体はブラウザに送らない） */
function maskApiKey(key: string): string {
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ pw?: string; ai?: string }>;
}) {
  await requireAuth();
  const { pw, ai } = await searchParams;
  const passwordMessage = pw ? PASSWORD_MESSAGES[pw] : undefined;
  const aiKeyMessage = ai ? AI_KEY_MESSAGES[ai] : undefined;
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

      <div
        id="ai"
        className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl"
      >
        <h2 className="font-bold">🤖 AI読み取り用のAPIキー</h2>
        <p className="mt-1 text-sm text-gray-500">
          請求書の書式をPDFから自動で取り込むときに使います。Claude
          のAPIキー（
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-700 underline"
          >
            console.anthropic.com
          </a>
          で発行）を登録してください。利用料はキーの持ち主のアカウントに請求されます。未登録でも、書式ページの「貼り付けで登録」なら使えます。
        </p>
        <p className="mt-3 text-sm">
          状態：
          {settings.anthropicApiKey ? (
            <span className="font-medium text-emerald-700">
              登録済み（{maskApiKey(settings.anthropicApiKey)}）
            </span>
          ) : (
            <span className="text-gray-500">未登録</span>
          )}
        </p>
        <form action={saveAnthropicApiKey} className="mt-3 flex flex-wrap gap-2">
          <input
            name="apiKey"
            type="password"
            required
            autoComplete="off"
            placeholder={
              settings.anthropicApiKey ? "新しいキーに変更する" : "sk-ant-..."
            }
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-medium hover:bg-sky-700"
          >
            確認して登録
          </button>
        </form>
        {settings.anthropicApiKey && (
          <form action={deleteAnthropicApiKey} className="mt-2">
            <button type="submit" className="text-sm text-red-600 hover:underline">
              APIキーを削除する
            </button>
          </form>
        )}
        {aiKeyMessage && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              aiKeyMessage.ok
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {aiKeyMessage.text}
          </p>
        )}
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
