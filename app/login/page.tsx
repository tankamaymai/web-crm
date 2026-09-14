import { redirect } from "next/navigation";
import { isLoggedIn, isPasswordConfigured } from "@/lib/auth";
import { login } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // 未設定なら初回セットアップへ、ログイン済みならトップへ
  if (!(await isPasswordConfigured())) redirect("/setup");
  if (await isLoggedIn()) redirect("/");

  const { error } = await searchParams;

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-lg font-bold text-white">
            W
          </span>
          <h1 className="text-xl font-bold">Web CRM</h1>
          <p className="text-sm text-gray-500">案件管理</p>
        </div>

        <form
          action={login}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <label className="block">
            <span className="text-sm text-gray-600">パスワード</span>
            <input
              name="password"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              パスワードが違います
            </p>
          )}

          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
          >
            ログイン
          </button>
        </form>
      </div>
    </div>
  );
}
