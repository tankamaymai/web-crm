import { prisma } from "@/lib/prisma";
import { createProject } from "@/app/actions/projects";
import PageHeader from "@/components/PageHeader";
import ProjectForm from "@/components/ProjectForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader title="新規案件" />
      {clients.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          先に顧客を登録してください。
          <Link href="/clients" className="text-sky-600 hover:underline ml-2">
            顧客登録へ
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-3xl">
          <ProjectForm
            action={createProject}
            clients={clients}
            cancelHref="/projects"
          />
        </div>
      )}
    </div>
  );
}
