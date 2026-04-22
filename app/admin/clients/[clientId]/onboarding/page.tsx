import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { verifySession, getClientOnboarding } from '@/lib/dal'
import { Button } from '@/components/ui/button'
import { OnboardingProgressBar } from '@/components/admin/onboarding-progress-bar'
import { KickoffFormSection } from '@/components/admin/kickoff-form-section'
import { OnboardingChecklistSection } from '@/components/admin/onboarding-checklist'
import { mergeChecklistWithDefaults, countChecked, CHECKLIST_TOTAL } from '@/types/onboarding'

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
  const checkedCount = countChecked(checklist)

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="space-y-4 mb-0">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </Button>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Onboarding — {client.companyName}</h1>
          <p className="text-neutral-500 text-sm mt-0.5">{client.user.email}</p>
        </div>
      </div>

      {/* Sticky progress bar */}
      <OnboardingProgressBar checked={checkedCount} total={CHECKLIST_TOTAL} />

      {/* Page content */}
      <div className="pt-8 space-y-10">
        {/* Editable kickoff form */}
        <KickoffFormSection clientId={clientId} intake={client.intake} />

        {/* Divider */}
        <div className="border-t border-neutral-200" />

        {/* Onboarding checklist */}
        <OnboardingChecklistSection clientId={clientId} checklist={checklist} />
      </div>
    </div>
  )
}
