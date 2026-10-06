import { prisma } from "@/lib/prisma";
import { updateProject } from "@/app/actions/projects";
import PageHeader from "@/components/PageHeader";
import ProjectForm from "@/components/ProjectForm";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProjectEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const [project, clients] = await Promise.all([
    prisma.project.findUnique({ where: { id } }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!project) notFound();

  return (
    <div>
      <PageHeader
        title="案件を編集"
        back={{ href: `/projects/${project.id}`, label: "案件の詳細" }}
      />
      <div className="card p-6 max-w-3xl">
        <ProjectForm
          action={updateProject.bind(null, project.id)}
          clients={clients}
          project={project}
          cancelHref={`/projects/${project.id}`}
        />
      </div>
    </div>
  );
}
