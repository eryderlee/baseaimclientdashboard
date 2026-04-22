'use client'

import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { updateBookingSystemConfig, type BookingSystemConfig } from '@/app/admin/actions'

const SYSTEM_OPTIONS = [
  'Calendly',
  'Cal.com',
  'Acuity',
  'Other',
  'None — needs to be set up',
  'Not sure',
]

interface BookingSystemSectionProps {
  clientId: string
  initialConfig: BookingSystemConfig | null
}

export function BookingSystemSection({
  clientId,
  initialConfig,
}: BookingSystemSectionProps) {
  const [system, setSystem] = useState(initialConfig?.system ?? '')
  const [otherName, setOtherName] = useState(initialConfig?.otherName ?? '')
  const [bookingUrl, setBookingUrl] = useState(initialConfig?.bookingUrl ?? '')
  const [saving, setSaving] = useState(false)

  const isOther = system === 'Other'
  const hasUrl = system && system !== 'None — needs to be set up' && system !== 'Not sure'

  async function handleSave() {
    if (!system) {
      toast.error('Please select a booking system')
      return
    }
    setSaving(true)
    const config: BookingSystemConfig = {
      system,
      ...(isOther && otherName ? { otherName } : {}),
      ...(hasUrl && bookingUrl ? { bookingUrl } : {}),
    }
    const result = await updateBookingSystemConfig(clientId, config)
    setSaving(false)
    if (result.success) {
      toast.success('Booking system saved')
    } else {
      toast.error(result.error ?? 'Failed to save')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking / Calendar System</CardTitle>
        <CardDescription>
          Record which booking tool this client uses and their booking link so leads can schedule directly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SYSTEM_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSystem(option)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-left transition-colors ${
                system === option
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-300 hover:bg-white'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-60" />
              {option}
            </button>
          ))}
        </div>

        {isOther && (
          <div>
            <Label className="text-xs text-neutral-500">Tool name</Label>
            <Input
              className="mt-1"
              placeholder="e.g. HubSpot, Bookly"
              value={otherName}
              onChange={(e) => setOtherName(e.target.value)}
            />
          </div>
        )}

        {hasUrl && (
          <div>
            <Label className="text-xs text-neutral-500">Booking URL</Label>
            <Input
              className="mt-1 font-mono text-sm"
              type="url"
              placeholder="https://calendly.com/client/30min"
              value={bookingUrl}
              onChange={(e) => setBookingUrl(e.target.value)}
            />
          </div>
        )}

        <div className="pt-1">
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save booking system'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
