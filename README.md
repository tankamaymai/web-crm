# Web CRM - 案件管理アプリ

Web制作の案件・タスク・請求書をまとめて管理する自分用アプリです。

## 主な機能

- **ダッシュボード** — 今月の売上（入金ベース）／請求額／未入金、進行中案件数、直近6ヶ月の売上グラフ、今日のタスク、期日が近い案件
- **案件管理** — 顧客・ステータス・受注金額・期日を管理。一覧表とカレンダーの両方で確認可能
- **カレンダー** — 案件の期日とタスクを月間カレンダーに表示
- **タスク管理** — 今日のタスク／期日超過／今後の予定をグルーピング。案件への紐付けも可能
- **請求書** — 案件詳細から**ワンクリックで請求書を発行**。発行済み→入金済みのステータス管理、未入金合計の表示
- **請求書PDF** — インボイス制度（適格請求書）対応のPDFを生成（登録番号・税率区分記載、日本語フォント同梱）
- **設定** — 請求書に印字される自社情報（事業者名・登録番号・振込先など）

## 技術スタック

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Prisma](https://www.prisma.io) + PostgreSQL
- [Recharts](https://recharts.org)（売上グラフ）
- [@react-pdf/renderer](https://react-pdf.org)（請求書PDF）

## セットアップ

PostgreSQL データベース（[Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) など）を用意し、接続文字列を環境変数に設定してください。

```bash
# 依存関係のインストール
npm install

# 環境変数（DATABASE_URL に接続文字列を設定）
cp .env.example .env

# データベースにマイグレーションを適用
npx prisma migrate deploy

# サンプルデータ投入（任意）
npm run db:seed

# 開発サーバー起動
npm run dev
```

http://localhost:3000 で起動します。

初回利用時は「設定」画面で自社情報（事業者名・インボイス登録番号・振込先）を入力してください。請求書PDFに印字されます。

## デプロイ（Vercel）

1. Vercel ダッシュボードでこのリポジトリをプロジェクトとしてインポート
2. Storage タブから Postgres（Neon 等）を追加し、プロジェクトに接続する
   - 接続すると `DATABASE_URL`（または `POSTGRES_PRISMA_URL` 等）が自動でプロジェクトの環境変数に設定される。変数名が異なる場合は `prisma/schema.prisma` の `env()` 参照名を合わせる
3. デプロイを実行すると、ビルド時に `prisma migrate deploy` が自動実行されテーブルが作成される（`package.json` の `vercel-build` スクリプト）

## データについて

認証機能はないため、自分だけがアクセスできる環境で利用してください。
