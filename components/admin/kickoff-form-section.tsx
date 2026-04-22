'use client'

import { useState } from 'react'
import type { ClientIntake } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { updateClientIntake } from '@/app/admin/actions'

interface KickoffFormSectionProps {
  clientId: string
  intake: ClientIntake | null
}

function toText(value: unknown): string {
  if (Array.isArray(value)) return value.join('\n')
  if (typeof value === 'string') return value
  return ''
}

function toArray(text: string): string[] {
  return text.split('\n').map((s) => s.trim()).filter(Boolean)
}

function toDateInput(date: Date | null | undefined): string {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0]
}

export function KickoffFormSection({ clientId, intake }: KickoffFormSectionProps) {
  const [saving, setSaving] = useState(false)

  // Text fields
  const [decisionMaker, setDecisionMaker] = useState(intake?.decisionMaker ?? '')
  const [state, setState] = useState(intake?.state ?? '')
  const [monthlyCapacity, setMonthlyCapacity] = useState(intake?.monthlyCapacity ?? '')
  const [excludedClientTypes, setExcludedClientTypes] = useState(intake?.excludedClientTypes ?? '')
  const [mainConcern, setMainConcern] = useState(intake?.mainConcern ?? '')
  const [targetRegions, setTargetRegions] = useState(intake?.targetRegions ?? '')
  const [geographyExclusions, setGeographyExclusions] = useState(intake?.geographyExclusions ?? '')
  const [bookingSystem, setBookingSystem] = useState(intake?.bookingSystem ?? '')
  const [bookingSystemOther, setBookingSystemOther] = useState(intake?.bookingSystemOther ?? '')

  // Boolean fields
  const [hasRunPaidAds, setHasRunPaidAds] = useState(intake?.hasRunPaidAds ?? false)
  const [hasSocialPage, setHasSocialPage] = useState(intake?.hasSocialPage ?? false)
  const [kickoffCallBooked, setKickoffCallBooked] = useState(intake?.kickoffCallBooked ?? false)
  const [kickoffCallDate, setKickoffCallDate] = useState(toDateInput(intake?.kickoffCallDate))

  // JSON array fields (stored as newline text)
  const [servicesOffered, setServicesOffered] = useState(toText(intake?.servicesOffered))
  const [targetServices, setTargetServices] = useState(toText(intake?.targetServices))
  const [idealClients, setIdealClients] = useState(toText(intake?.idealClients))
  const [goals90Day, setGoals90Day] = useState(toText(intake?.goals90Day))
  const [currentSituation, setCurrentSituation] = useState(toText(intake?.currentSituation))
  const [targetGeography, setTargetGeography] = useState(toText(intake?.targetGeography))

  async function handleSave() {
    setSaving(true)
    const result = await updateClientIntake(clientId, {
      decisionMaker,
      state,
      monthlyCapacity,
      excludedClientTypes: excludedClientTypes || undefined,
      mainConcern: mainConcern || undefined,
      targetRegions: targetRegions || undefined,
      geographyExclusions: geographyExclusions || undefined,
      bookingSystem: bookingSystem || undefined,
      bookingSystemOther: bookingSystemOther || undefined,
      hasRunPaidAds,
      hasSocialPage,
      kickoffCallBooked,
      kickoffCallDate: kickoffCallBooked && kickoffCallDate ? kickoffCallDate : undefined,
      servicesOffered: toArray(servicesOffered),
      targetServices: toArray(targetServices),
      idealClients: toArray(idealClients),
      goals90Day: toArray(goals90Day),
      currentSituation: toArray(currentSituation),
      targetGeography: toArray(targetGeography),
    })
    setSaving(false)
    if (result.success) {
      toast.success('Kickoff form saved')
    } else {
      toast.error(result.error ?? 'Failed to save')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">Kickoff Form Data</h2>
          {!intake && (
            <p className="text-xs text-neutral-500 mt-0.5">No intake data yet — fill in the form below to create it.</p>
          )}
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : intake ? 'Save changes' : 'Create intake record'}
        </Button>
      </div>

      {/* Row 1: Business basics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs text-neutral-500">Decision maker</Label>
          <Input className="mt-1 h-9" value={decisionMaker} onChange={(e) => setDecisionMaker(e.target.value)} placeholder="just_me / partner_involved" />
        </div>
        <div>
          <Label className="text-xs text-neutral-500">State</Label>
          <Input className="mt-1 h-9" value={state} onChange={(e) => setState(e.target.value)} placeholder="NSW" />
        </div>
        <div>
          <Label className="text-xs text-neutral-500">Monthly capacity</Label>
          <Input className="mt-1 h-9" value={monthlyCapacity} onChange={(e) => setMonthlyCapacity(e.target.value)} placeholder="1-3 / 4-6 / 7-10 / 10+" />
        </div>
      </div>

      {/* Row 2: Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
          <Label className="text-sm text-neutral-700 cursor-pointer">Has run paid ads</Label>
          <Switch checked={hasRunPaidAds} onCheckedChange={setHasRunPaidAds} className="scale-90" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
          <Label className="text-sm text-neutral-700 cursor-pointer">Has social page</Label>
          <Switch checked={hasSocialPage} onCheckedChange={setHasSocialPage} className="scale-90" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
          <Label className="text-sm text-neutral-700 cursor-pointer">Kickoff call booked</Label>
          <Switch checked={kickoffCallBooked} onCheckedChange={setKickoffCallBooked} className="scale-90" />
        </div>
      </div>

      {/* Kickoff date (conditional) */}
      {kickoffCallBooked && (
        <div className="max-w-xs">
          <Label className="text-xs text-neutral-500">Kickoff call date</Label>
          <Input className="mt-1 h-9" type="date" value={kickoffCallDate} onChange={(e) => setKickoffCallDate(e.target.value)} />
        </div>
      )}

      {/* Row 3: Array fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-neutral-500">Services offered (one per line)</Label>
          <Textarea className="mt-1 resize-none text-sm" rows={3} value={servicesOffered} onChange={(e) => setServicesOffered(e.target.value)} placeholder="Individual tax returns&#10;Business tax returns" />
        </div>
        <div>
          <Label className="text-xs text-neutral-500">Target services for ads (one per line, max 3)</Label>
          <Textarea className="mt-1 resize-none text-sm" rows={3} value={targetServices} onChange={(e) => setTargetServices(e.target.value)} placeholder="Individual tax returns&#10;Business tax returns" />
        </div>
        <div>
          <Label className="text-xs text-neutral-500">Ideal clients (one per line)</Label>
          <Textarea className="mt-1 resize-none text-sm" rows={3} value={idealClients} onChange={(e) => setIdealClients(e.target.value)} placeholder="Sole traders & contractors&#10;Small business owners" />
        </div>
        <div>
          <Label className="text-xs text-neutral-500">Excluded client types</Label>
          <Textarea className="mt-1 resize-none text-sm" rows={3} value={excludedClientTypes} onChange={(e) => setExcludedClientTypes(e.target.value)} placeholder="Optional" />
        </div>
        <div>
          <Label className="text-xs text-neutral-500">90-day goals (one per line)</Label>
          <Textarea className="mt-1 resize-none text-sm" rows={3} value={goals90Day} onChange={(e) => setGoals90Day(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-neutral-500">Current situation (one per line)</Label>
          <Textarea className="mt-1 resize-none text-sm" rows={3} value={currentSituation} onChange={(e) => setCurrentSituation(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-neutral-500">Target geography (one per line)</Label>
          <Textarea className="mt-1 resize-none text-sm" rows={2} value={targetGeography} onChange={(e) => setTargetGeography(e.target.value)} placeholder="📍 My home state only" />
        </div>
        <div>
          <Label className="text-xs text-neutral-500">Main concern</Label>
          <Textarea className="mt-1 resize-none text-sm" rows={2} value={mainConcern} onChange={(e) => setMainConcern(e.target.value)} placeholder="Optional" />
        </div>
      </div>

      {/* Row 4: Geography text fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-neutral-500">Specific regions</Label>
          <Input className="mt-1 h-9" value={targetRegions} onChange={(e) => setTargetRegions(e.target.value)} placeholder="Optional" />
        </div>
        <div>
          <Label className="text-xs text-neutral-500">Geography exclusions</Label>
          <Input className="mt-1 h-9" value={geographyExclusions} onChange={(e) => setGeographyExclusions(e.target.value)} placeholder="Optional" />
        </div>
      </div>

      {/* Row 5: Booking system */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-neutral-500">Booking system</Label>
          <Input className="mt-1 h-9" value={bookingSystem} onChange={(e) => setBookingSystem(e.target.value)} placeholder="Calendly / Cal.com / None / etc." />
        </div>
        <div>
          <Label className="text-xs text-neutral-500">Booking system (other — specify)</Label>
          <Input className="mt-1 h-9" value={bookingSystemOther} onChange={(e) => setBookingSystemOther(e.target.value)} placeholder="Optional" />
        </div>
      </div>
    </div>
  )
}
