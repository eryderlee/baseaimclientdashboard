import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { verifySession } from "@/lib/dal"
import { prisma } from "@/lib/prisma"
import { ClientDocuments } from "@/components/admin/client-documents"
import { Button } from "@/components/ui/button"

export default async function ClientDocumentsPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { userRole } = await verifySession()
  if (userRole !== "ADMIN") {
    redirect("/dashboard")
  }

  const { clientId } = await params

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { companyName: true },
  })

  if (!client) redirect("/admin")

  const documents = await prisma.document.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      fileName: true,
      fileSize: true,
      fileType: true,
      status: true,
      createdAt: true,
    },
  })

  const serializedDocuments = documents.map((doc) => ({
    ...doc,
    createdAt: doc.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/clients/${clientId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Milestones
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{client.companyName}</h1>
        <p className="text-neutral-500 mt-1">Manage documents for this client</p>
      </div>

      <ClientDocuments clientId={clientId} documents={serializedDocuments} />
    </div>
  )
}
