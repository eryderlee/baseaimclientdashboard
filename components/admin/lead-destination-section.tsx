'use client'

import { useState } from 'react'
import { Mail, Smartphone, Webhook, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { updateLeadDestinations, sendTestLead, type LeadDestinations } from '@/app/admin/actions'
import crypto from 'crypto'

interface LeadDestinationSectionProps {
  clientId: string
  initialDestinations: LeadDestinations | null
}

export function LeadDestinationSection({
  clientId,
  initialDestinations,
}: LeadDestinationSectionProps) {
  const [destinations, setDestinations] = useState<LeadDestinations>(
    initialDestinations ?? {}
  )
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const email = destinations.email ?? { enabled: false, address: '' }
  const sms = destinations.sms ?? { enabled: false }
  const crmWebhook = destinations.crmWebhook ?? { enabled: false }
  const custom = destinations.custom ?? []

  function update(patch: Partial<LeadDestinations>) {
    setDestinations((prev) => ({ ...prev, ...patch }))
  }

  async function handleSave() {
    setSaving(true)
    const result = await updateLeadDestinations(clientId, destinations)
    setSaving(false)
    if (result.success) {
      toast.success('Lead destinations saved')
    } else {
      toast.error(result.error ?? 'Failed to save')
    }
  }

  async function handleTestLead() {
    setTesting(true)
    const result = await sendTestLead(clientId)
    setTesting(false)
    if (result.success) {
      toast.success('Test lead sent — check your inbox')
      // Reflect tested state locally
      update({ email: { ...email, tested: true, testedAt: new Date().toISOString() } })
    } else {
      toast.error(result.error ?? 'Failed to send test lead')
    }
  }

  function addCustomChannel() {
    update({
      custom: [
        ...custom,
        { id: crypto.randomUUID(), name: 'Custom channel', enabled: false, url: '' },
      ],
    })
  }

  function removeCustomChannel(id: string) {
    update({ custom: custom.filter((c) => c.id !== id) })
  }

  function updateCustomChannel(id: string, patch: Partial<(typeof custom)[number]>) {
    update({
      custom: custom.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })
  }

  const emailTested = email.tested && email.testedAt
  const emailTestedDate = emailTested
    ? new Date(email.testedAt!).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Destination</CardTitle>
        <CardDescription>
          Configure where new leads are sent when they come in from ad campaigns.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">

        {/* Email channel */}
        <ChannelCard
          icon={<Mail className="h-4 w-4" />}
          label="Email"
          enabled={email.enabled}
          onToggle={(v) => update({ email: { ...email, enabled: v } })}
        >
          <div className="space-y-3 mt-3">
            <div>
              <Label className="text-xs text-neutral-500">Email address</Label>
              <Input
                className="mt-1"
                type="email"
                placeholder="client@firm.com.au"
                value={email.address}
                onChange={(e) => update({ email: { ...email, address: e.target.value } })}
              />
            </div>
            <div>
              <Label className="text-xs text-neutral-500">Also CC</Label>
              <Input
                className="mt-1"
                type="email"
                placeholder="assistant@firm.com.au"
                value={email.cc ?? ''}
                onChange={(e) => update({ email: { ...email, cc: e.target.value || undefined } })}
              />
            </div>
          </div>
        </ChannelCard>

        {/* SMS channel */}
        <ChannelCard
          icon={<Smartphone className="h-4 w-4" />}
          label="SMS"
          enabled={sms.enabled}
          onToggle={(v) => update({ sms: { ...sms, enabled: v } })}
        >
          <div className="mt-3">
            <Label className="text-xs text-neutral-500">Phone number</Label>
            <Input
              className="mt-1"
              type="tel"
              placeholder="+61 4xx xxx xxx"
              value={sms.phone ?? ''}
              onChange={(e) => update({ sms: { ...sms, phone: e.target.value || undefined } })}
            />
          </div>
        </ChannelCard>

        {/* CRM Webhook channel */}
        <ChannelCard
          icon={<Webhook className="h-4 w-4" />}
          label="CRM Webhook"
          enabled={crmWebhook.enabled}
          onToggle={(v) => update({ crmWebhook: { ...crmWebhook, enabled: v } })}
        >
          <div className="mt-3">
            <Label className="text-xs text-neutral-500">Webhook URL</Label>
            <Input
              className="mt-1 font-mono text-sm"
              type="url"
              placeholder="https://crm.example.com/webhook/leads"
              value={crmWebhook.url ?? ''}
              onChange={(e) =>
                update({ crmWebhook: { ...crmWebhook, url: e.target.value || undefined } })
              }
            />
          </div>
        </ChannelCard>

        {/* Custom channels */}
        {custom.map((ch) => (
          <ChannelCard
            key={ch.id}
            icon={<Plus className="h-4 w-4" />}
            label={ch.name}
            enabled={ch.enabled}
            onToggle={(v) => updateCustomChannel(ch.id, { enabled: v })}
            onRemove={() => removeCustomChannel(ch.id)}
            nameable
            onNameChange={(name) => updateCustomChannel(ch.id, { name })}
          >
            <div className="mt-3">
              <Label className="text-xs text-neutral-500">Webhook URL</Label>
              <Input
                className="mt-1 font-mono text-sm"
                type="url"
                placeholder="https://..."
                value={ch.url ?? ''}
                onChange={(e) => updateCustomChannel(ch.id, { url: e.target.value || undefined })}
              />
            </div>
          </ChannelCard>
        ))}

        {/* Add custom channel */}
        <button
          type="button"
          onClick={addCustomChannel}
          className="text-sm text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add custom channel
        </button>

        {/* Divider + status + test */}
        <div className="border-t pt-4 space-y-3">
          {emailTested ? (
            <p className="text-sm text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Email delivery tested {emailTestedDate}
            </p>
          ) : (
            <p className="text-sm text-neutral-400">Email delivery not yet tested</p>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestLead}
              disabled={testing || !email.enabled || !email.address}
            >
              {testing ? 'Sending…' : 'Send test lead'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save destinations'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface ChannelCardProps {
  icon: React.ReactNode
  label: string
  enabled: boolean
  onToggle: (v: boolean) => void
  onRemove?: () => void
  nameable?: boolean
  onNameChange?: (name: string) => void
  children?: React.ReactNode
}

function ChannelCard({
  icon,
  label,
  enabled,
  onToggle,
  onRemove,
  nameable,
  onNameChange,
  children,
}: ChannelCardProps) {
  return (
    <div className="rounded-lg border bg-neutral-50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {nameable && onNameChange ? (
            <input
              className="bg-transparent font-medium text-sm outline-none border-b border-transparent focus:border-neutral-300 w-36"
              value={label}
              onChange={(e) => onNameChange(e.target.value)}
            />
          ) : (
            <span>{label}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            className="scale-90"
          />
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-neutral-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {enabled && children}
    </div>
  )
}
