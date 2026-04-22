import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { verifySession, getClientIntake } from '@/lib/dal'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default async function ClientIntakePage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') {
    redirect('/dashboard')
  }

  const { clientId } = await params
  const client = await getClientIntake(clientId)
  const intake = client.intake

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/clients/${clientId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {client.companyName}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Intake Details</h1>
        <p className="text-neutral-500 mt-1">{client.companyName} — {client.user.email}</p>
      </div>

      {!intake ? (
        <Card>
          <CardContent className="py-12 text-center text-neutral-500">
            No intake data — this client was created manually, not via the survey.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business Info</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <Field label="Decision maker" value={intake.decisionMaker} />
              <Field label="State" value={intake.state} />
              <Field label="Monthly capacity" value={intake.monthlyCapacity} />
              <Field
                label="Has run paid ads"
                value={intake.hasRunPaidAds ? 'Yes' : 'No'}
              />
              <Field
                label="Has social page"
                value={intake.hasSocialPage ? 'Yes' : 'No'}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Services &amp; Clients</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <Field
                label="Services offered"
                value={toList(intake.servicesOffered)}
              />
              <Field
                label="Target services (ads)"
                value={toList(intake.targetServices)}
              />
              <Field
                label="Ideal clients"
                value={toList(intake.idealClients)}
              />
              {intake.excludedClientTypes && (
                <Field
                  label="Excluded client types"
                  value={intake.excludedClientTypes}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Geography</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <Field
                label="Target geography"
                value={toList(intake.targetGeography)}
              />
              {intake.targetRegions && (
                <Field label="Specific regions" value={intake.targetRegions} />
              )}
              {intake.geographyExclusions && (
                <Field
                  label="Geography exclusions"
                  value={intake.geographyExclusions}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Goals &amp; Situation</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <Field label="90-day goals" value={toList(intake.goals90Day)} />
              <Field
                label="Current situation"
                value={toList(intake.currentSituation)}
              />
              {intake.mainConcern && (
                <Field
                  label="Main concern"
                  value={intake.mainConcern}
                  fullWidth
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kickoff Call</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <Field
                label="Call booked"
                value={intake.kickoffCallBooked ? 'Yes' : 'No'}
              />
              {intake.kickoffCallDate && (
                <Field
                  label="Call date"
                  value={intake.kickoffCallDate.toLocaleDateString('en-AU', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  fullWidth,
}: {
  label: string
  value: string
  fullWidth?: boolean
}) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : undefined}>
      <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className="text-neutral-900 whitespace-pre-wrap">{value || '—'}</p>
    </div>
  )
}

function toList(value: unknown): string {
  if (Array.isArray(value)) return value.join('\n')
  return String(value ?? '—')
}
