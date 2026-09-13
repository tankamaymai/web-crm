import { prisma } from "@/lib/prisma";
import { createProject } from "@/app/actions/projects";
import { PROJECT_STATUS_LABELS } from "@/lib/status";
import PageHeader from "@/components/PageHeader";
import ProjectForm from "@/components/ProjectForm";
import ProjectCopyPicker, {
  type CopySource,
} from "@/components/ProjectCopyPicker";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  await requireAuth();
  const { from } = await searchParams;

  const [clients, pastProjects] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { name: true } },
        _count: { select: { credentials: true } },
      },
    }),
  ]);

  // コピー元が指定されていれば、その内容をフォームの初期値にする
  const source = from
    ? await prisma.project.findUnique({ where: { id: from } })
    : null;
  const sourceCredentialCount = source
    ? await prisma.siteCredential.count({ where: { projectId: source.id } })
    : 0;

  // 日付とステータスは引き継がない（新しい案件として入力し直す）
  const template = source
    ? { ...source, startDate: null, dueDate: null, status: "LEAD" }
    : undefined;

  const copySources: CopySource[] = pastProjects.map((p) => ({
    id: p.id,
    title: p.title,
    clientName: p.client.name,
    statusLabel: PROJECT_STATUS_LABELS[p.status] ?? p.status,
    monthLabel: p.dueDate
      ? `${p.dueDate.getUTCFullYear()}/${p.dueDate.getUTCMonth() + 1}`
      : null,
    credentialCount: p._count.credentials,
  }));

  return (
    <div>
      <PageHeader title={source ? "新規案件（コピー）" : "新規案件"} />
      {clients.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          先に顧客を登録してください。
          <Link href="/clients" className="text-sky-600 hover:underline ml-2">
            顧客登録へ
          </Link>
        </div>
      ) : (
        <div className="max-w-3xl">
          {!source && <ProjectCopyPicker sources={copySources} />}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <ProjectForm
              action={createProject}
              clients={clients}
              project={template}
              cancelHref="/projects"
              copyFrom={
                source
                  ? {
                      id: source.id,
                      title: source.title,
                      credentialCount: sourceCredentialCount,
                    }
                  : undefined
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
