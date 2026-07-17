import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function todayJST(): Date {
  const now = new Date(Date.now() + JST_OFFSET_MS);
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY);
}

function monthsAgo(date: Date, months: number, day: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months, day)
  );
}

function endOfNextMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 2, 0));
}

function invoiceNumberFor(date: Date, seq: number): string {
  const ym = date.toISOString().slice(0, 7).replace("-", "");
  return `INV-${ym}-${String(seq).padStart(3, "0")}`;
}

async function main() {
  const today = todayJST();

  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();

  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      businessName: "サンプル ウェブ制作",
      postalCode: "150-0001",
      address: "東京都渋谷区神宮前1-2-3",
      phone: "03-1234-5678",
      email: "hello@example.com",
      // インボイス登録済みの場合のみ設定画面で登録番号を入力する
      bankInfo: "サンプル銀行 渋谷支店\n普通 1234567\nヤマダ タロウ",
      defaultTaxRate: 10,
      monthlyGoal: 500000,
      paymentTermDays: 30,
    },
  });

  const [tanaka, suzuki, sato] = await Promise.all([
    prisma.client.create({
      data: {
        name: "田中 一郎",
        company: "田中商店",
        email: "tanaka@example.com",
        phone: "090-1111-2222",
      },
    }),
    prisma.client.create({
      data: {
        name: "鈴木 花子",
        company: "株式会社スズキ企画",
        email: "suzuki@example.com",
      },
    }),
    prisma.client.create({
      data: {
        name: "佐藤 健",
        company: "サトウ整体院",
        phone: "080-3333-4444",
        // インボイス経過措置の調整計算を求められている取引先の例
        taxMode: "ADJUSTED_DISCOUNT",
      },
    }),
  ]);

  const corporate = await prisma.project.create({
    data: {
      title: "田中商店 コーポレートサイト制作",
      clientId: tanaka.id,
      status: "IN_PROGRESS",
      amount: 450000,
      startDate: addDays(today, -20),
      dueDate: addDays(today, 10),
      description: "10ページ構成のコーポレートサイト。WordPress実装。",
    },
  });

  const lp = await prisma.project.create({
    data: {
      title: "スズキ企画 キャンペーンLP",
      clientId: suzuki.id,
      status: "REVIEW",
      amount: 180000,
      startDate: addDays(today, -10),
      dueDate: addDays(today, 3),
      description: "夏季キャンペーン用ランディングページ1枚。",
    },
  });

  await prisma.project.create({
    data: {
      title: "サトウ整体院 予約サイト",
      clientId: sato.id,
      status: "LEAD",
      amount: 320000,
      dueDate: addDays(today, 40),
      description: "予約システム付きサイトの見積もり中。",
    },
  });

  const maintenance = await prisma.project.create({
    data: {
      title: "田中商店 サイト保守（月額）",
      clientId: tanaka.id,
      status: "IN_PROGRESS",
      amount: 30000,
      recurring: true,
      startDate: monthsAgo(today, 6, 1),
      description: "月額保守契約。毎月末請求。",
    },
  });

  const renewal = await prisma.project.create({
    data: {
      title: "スズキ企画 サイトリニューアル",
      clientId: suzuki.id,
      status: "COMPLETED",
      amount: 600000,
      startDate: monthsAgo(today, 4, 5),
      dueDate: monthsAgo(today, 1, 20),
    },
  });

  await prisma.task.createMany({
    data: [
      {
        title: "トップページのデザイン修正",
        projectId: corporate.id,
        dueDate: today,
        priority: 2,
      },
      {
        title: "お問い合わせフォームの実装",
        projectId: corporate.id,
        dueDate: addDays(today, 2),
      },
      {
        title: "LPの修正フィードバック対応",
        projectId: lp.id,
        dueDate: addDays(today, -1),
        priority: 1,
      },
      {
        title: "請求書の送付確認",
        dueDate: today,
      },
      {
        title: "サーバー契約の更新",
        dueDate: addDays(today, 7),
      },
      {
        title: "先週のバックアップ確認",
        projectId: maintenance.id,
        dueDate: addDays(today, -3),
        completed: true,
        completedAt: addDays(today, -3),
      },
    ],
  });

  // 過去6ヶ月の入金済み請求書（ダッシュボードのグラフ用）
  for (let m = 5; m >= 1; m--) {
    const issue = monthsAgo(today, m, 25);
    await prisma.invoice.create({
      data: {
        invoiceNumber: invoiceNumberFor(issue, 1),
        clientId: tanaka.id,
        projectId: maintenance.id,
        status: "PAID",
        issueDate: issue,
        dueDate: endOfNextMonth(issue),
        taxRate: 10,
        paidAt: addDays(issue, 15),
        items: {
          create: [
            {
              description: `サイト保守費用（${issue.getUTCMonth() + 1}月分）`,
              quantity: 1,
              unitPrice: 33000,
            },
          ],
        },
      },
    });
  }

  // リニューアル案件: 着手金（入金済み・2ヶ月前）+ 残金（発行済み・未入金）
  const depositIssue = monthsAgo(today, 2, 10);
  await prisma.invoice.create({
    data: {
      invoiceNumber: invoiceNumberFor(depositIssue, 2),
      clientId: suzuki.id,
      projectId: renewal.id,
      status: "PAID",
      issueDate: depositIssue,
      dueDate: endOfNextMonth(depositIssue),
      taxRate: 10,
      paidAt: addDays(depositIssue, 20),
      items: {
        create: [
          {
            description: "サイトリニューアル 着手金（50%）",
            quantity: 1,
            unitPrice: 330000,
          },
        ],
      },
    },
  });

  const balanceIssue = monthsAgo(today, 1, 20);
  await prisma.invoice.create({
    data: {
      invoiceNumber: invoiceNumberFor(balanceIssue, 2),
      clientId: suzuki.id,
      projectId: renewal.id,
      status: "SENT",
      issueDate: balanceIssue,
      dueDate: endOfNextMonth(balanceIssue),
      taxRate: 10,
      items: {
        create: [
          {
            description: "サイトリニューアル 残金（50%）",
            quantity: 1,
            unitPrice: 330000,
          },
        ],
      },
    },
  });

  // 今月の入金済み請求書（今月の売上に反映される）
  const thisMonthIssue = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)
  );
  await prisma.invoice.create({
    data: {
      invoiceNumber: invoiceNumberFor(thisMonthIssue, 1),
      clientId: tanaka.id,
      projectId: maintenance.id,
      status: "PAID",
      issueDate: thisMonthIssue,
      dueDate: endOfNextMonth(thisMonthIssue),
      taxRate: 10,
      paidAt: addDays(thisMonthIssue, 1),
      items: {
        create: [
          {
            description: `サイト保守費用（${thisMonthIssue.getUTCMonth() + 1}月分）`,
            quantity: 1,
            unitPrice: 33000,
          },
        ],
      },
    },
  });

  console.log("シードデータを投入しました");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
