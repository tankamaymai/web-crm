export const dynamic = "force-dynamic";

export default function SetupPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-bold text-amber-900">
          🔒 ログインパスワードが未設定です
        </h1>
        <p className="mt-2 text-sm text-amber-800">
          サイトのIDやパスワードを扱うため、パスワードを設定するまでアプリの中身は表示されません。
        </p>
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-amber-900">
          <li>Vercel のプロジェクト設定 → Settings → Environment Variables を開く</li>
          <li>
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
              APP_PASSWORD
            </code>{" "}
            を追加し、好きなパスワードを設定する
          </li>
          <li>Production と Preview の両方にチェックを入れる</li>
          <li>保存後、Deployments から最新のデプロイを Redeploy する</li>
        </ol>
        <p className="mt-4 text-xs text-amber-700">
          ※ パスワードを変更すると、ログイン済みの端末は再ログインが必要になります。
        </p>
      </div>
    </div>
  );
}
