import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { verifySession, getClientWithMilestones } from "@/lib/dal"
import { prisma } from "@/lib/prisma"
import { calculateMilestoneProgress } from "@/lib/utils/progress"
import { MilestoneEditTable } from "@/components/admin/milestone-edit-table"
import { ClientDocuments } from "@/components/admin/client-documents"
import { Button } from "@/components/ui/button"

export default async function ClientMilestonePage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  // 1. Verify admin access
  const { userRole } = await verifySession()
  if (userRole !== "ADMIN") {
    redirect("/dashboard")
  }

  // 2. Await params (Next.js 16+ async params)
  const { clientId } = await params

  // 3. Fetch client data via DAL
  const client = await getClientWithMilestones(clientId)

  // 4. Fetch documents for this client
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

  // 5. Serialize document dates
  const serializedDocuments = documents.map((doc) => ({
    ...doc,
    createdAt: doc.createdAt.toISOString(),
  }))

  // 6. Serialize milestone dates and compute progress
  const serializedMilestones = client.milestones.map((milestone) => {
    // Pass notes as-is (they're already JSON from database)
    // They should be MilestoneNote[] objects with id, content, createdAt, createdBy
    const notesData = Array.isArray(milestone.notes) ? milestone.notes : []

    return {
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      status: milestone.status,
      dueDate: milestone.dueDate ? milestone.dueDate.toISOString() : null,
      startDate: milestone.startDate ? milestone.startDate.toISOString() : null,
      notes: notesData,
      progress: calculateMilestoneProgress(
        milestone.status,
        milestone.startDate,
        milestone.dueDate
      ),
      order: milestone.order,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {client.companyName}
        </h1>
        <p className="text-neutral-500 mt-1">
          Manage milestones and documents for {client.user.name}
        </p>
      </div>

      <MilestoneEditTable
        clientId={clientId}
        initialMilestones={serializedMilestones}
      />

      <div className="border rounded-lg p-6">
        <ClientDocuments
          clientId={clientId}
          documents={serializedDocuments}
        />
      </div>
    </div>
  )
}
