import { prisma } from "@/lib/prisma";
import { updateProject } from "@/app/actions/projects";
import PageHeader from "@/components/PageHeader";
import ProjectForm from "@/components/ProjectForm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProjectEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, clients] = await Promise.all([
    prisma.project.findUnique({ where: { id } }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!project) notFound();

  return (
    <div>
      <PageHeader title="案件を編集" />
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-3xl">
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
