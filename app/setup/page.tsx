export const dynamic = "force-dynamic";

/** 値は絶対に出さず、キー名と有無だけを表示する */
function diagnostics() {
  const env = process.env;
  const relatedKeys = Object.keys(env)
    .filter((key) => /^APP_|PASSWORD|PASSWD/i.test(key))
    .sort();
  return {
    // このページ(Node)の実行環境から見えているか。
    // proxy 側と食い違う場合は実行環境の差が原因と分かる。
    visibleHere: Boolean(env.APP_PASSWORD && env.APP_PASSWORD.length > 0),
    relatedKeys,
    vercelEnv: env.VERCEL_ENV ?? null,
    branch: env.VERCEL_GIT_COMMIT_REF ?? null,
    commit: (env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || null,
  };
}

export default function SetupPage() {
  const { visibleHere, relatedKeys, vercelEnv, branch, commit } = diagnostics();

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-xl space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-lg font-bold text-amber-900">
            🔒 ログインパスワードが未設定です
          </h1>
          <p className="mt-2 text-sm text-amber-800">
            サイトのIDやパスワードを扱うため、パスワードを設定するまでアプリの中身は表示されません。
          </p>

          <h2 className="mt-4 text-sm font-bold text-amber-900">設定手順</h2>
          <ol className="mt-1.5 list-decimal space-y-1.5 pl-5 text-sm text-amber-900">
            <li>
              Vercel → プロジェクト → Settings → Environment Variables を開く
            </li>
            <li>
              Key に{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
                APP_PASSWORD
              </code>
              、Value に好きなパスワードを入力する
            </li>
            <li>
              <strong>Production・Preview・Development の3つすべて</strong>
              にチェックを入れて Save
            </li>
            <li>
              <strong>Deployments タブ → 最新のデプロイの「…」→ Redeploy</strong>
              （環境変数は保存しただけでは反映されず、デプロイし直しが必要です）
            </li>
          </ol>
          <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900">
            ⚠️ すでに設定済みなのにこの画面が出る場合、ほとんどは「Redeploy
            していない」か「Preview
            にチェックが入っていない」のどちらかです。下の診断情報で確認できます。
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm">
          <h2 className="mb-3 font-bold">診断情報</h2>
          <dl className="space-y-2">
            <div className="flex items-start gap-3">
              <dt className="w-44 shrink-0 text-gray-500">APP_PASSWORD</dt>
              <dd className={visibleHere ? "text-emerald-700" : "text-red-600"}>
                {visibleHere
                  ? "検出できています"
                  : "この実行環境からは見えていません"}
              </dd>
            </div>
            <div className="flex items-start gap-3">
              <dt className="w-44 shrink-0 text-gray-500">環境</dt>
              <dd>{vercelEnv ?? "ローカル"}</dd>
            </div>
            {branch && (
              <div className="flex items-start gap-3">
                <dt className="w-44 shrink-0 text-gray-500">ブランチ</dt>
                <dd className="break-all font-mono text-xs">{branch}</dd>
              </div>
            )}
            {commit && (
              <div className="flex items-start gap-3">
                <dt className="w-44 shrink-0 text-gray-500">コミット</dt>
                <dd className="font-mono text-xs">{commit}</dd>
              </div>
            )}
            <div className="flex items-start gap-3">
              <dt className="w-44 shrink-0 text-gray-500">
                関連しそうな変数名
              </dt>
              <dd className="min-w-0">
                {relatedKeys.length === 0 ? (
                  <span className="text-gray-400">なし</span>
                ) : (
                  <span className="break-all font-mono text-xs">
                    {relatedKeys.join(", ")}
                  </span>
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-gray-400">
            ※ 値は表示していません（変数名と有無のみ）。名前が
            <code className="mx-1 font-mono">APP_PASSWORD</code>
            と1文字でも違うと認識されません。
          </p>
        </div>
      </div>
    </div>
  );
}
