import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { verifySession, getClientOnboarding } from '@/lib/dal'
import { Button } from '@/components/ui/button'
import { OnboardingClient } from '@/components/admin/onboarding-checklist'
import { mergeChecklistWithDefaults } from '@/types/onboarding'
import type { ChecklistNotes } from '@/types/onboarding'

export default async function ClientOnboardingPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') {
    redirect('/dashboard')
  }

  const { clientId } = await params
  const client = await getClientOnboarding(clientId)

  const checklist = mergeChecklistWithDefaults(client.onboardingChecklist)
  const notes = (client.checklistNotes ?? {}) as ChecklistNotes

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </Button>

        <div className="mt-3">
          <h1 className="text-2xl font-bold tracking-tight">Onboarding — {client.companyName}</h1>
          <p className="text-neutral-500 text-sm mt-0.5">{client.user.email}</p>
        </div>
      </div>

      {/* Client-side: sticky progress bar + kickoff form + checklist */}
      <OnboardingClient
        clientId={clientId}
        intake={client.intake}
        initialChecklist={checklist}
        initialNotes={notes}
      />
    </div>
  )
}
