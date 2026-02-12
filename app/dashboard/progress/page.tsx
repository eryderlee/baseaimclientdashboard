import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MilestoneChecklist } from "@/components/dashboard/milestone-checklist"

export default async function ProgressPage() {
  // Get authenticated session
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Fetch milestones from database
  const milestones = await prisma.milestone.findMany({
    where: {
      client: {
        userId: session.user.id
      }
    },
    orderBy: {
      order: 'asc'
    }
  }).then(items => items.map(item => ({
    ...item,
    notes: Array.isArray(item.notes) ? item.notes : []
  })))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Progress Tracking</h1>
        <p className="text-neutral-500 mt-1">
          Monitor your project milestones and track progress
        </p>
      </div>

      {/* Milestone Checklist Component */}
      <MilestoneChecklist milestones={milestones} />
    </div>
  )
}
