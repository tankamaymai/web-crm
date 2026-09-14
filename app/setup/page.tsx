import { redirect } from "next/navigation";
import { isPasswordConfigured } from "@/lib/auth";
import { setupPassword } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  short: "パスワードは6文字以上にしてください",
  mismatch: "確認用のパスワードが一致しません",
};

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // すでに設定済みなら、ここからパスワードを作り直せないようにする
  if (await isPasswordConfigured()) redirect("/login");

  const { error } = await searchParams;
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm";

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-lg font-bold text-white">
            W
          </span>
          <h1 className="text-xl font-bold">はじめの設定</h1>
          <p className="text-center text-sm text-gray-500">
            ログイン用のパスワードを決めてください。
            <br />
            次回からこのパスワードでログインします。
          </p>
        </div>

        <form
          action={setupPassword}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <label className="block">
            <span className="text-sm text-gray-600">パスワード（6文字以上）</span>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoFocus
              autoComplete="new-password"
              className={inputClass}
            />
          </label>
          <label className="mt-3 block">
            <span className="text-sm text-gray-600">確認のためもう一度</span>
            <input
              name="confirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClass}
            />
          </label>

          {error && ERRORS[error] && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {ERRORS[error]}
            </p>
          )}

          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
          >
            この内容ではじめる
          </button>
          <p className="mt-3 text-xs text-gray-400">
            設定するとすぐにログインした状態になります。パスワードは設定画面からいつでも変更できます。
          </p>
        </form>
      </div>
    </div>
  );
}
