'use client'

import { useState, useTransition } from 'react'
import { RefreshCw, XCircle, Link2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import {
  startSubscription,
  cancelSubscription,
  createCardSetupLink,
} from '@/app/actions/billing'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SubscriptionManagerProps {
  clientId: string
  subscription: {
    id: string
    status: string
    currentPeriodEnd: string | null // ISO string (serialized from server)
    stripePriceId: string | null
    stripeSubscriptionId: string | null
  } | null
}

export function SubscriptionManager({
  clientId,
  subscription,
}: SubscriptionManagerProps) {
  const [isPending, startTransition] = useTransition()
  const [isSetupPending, startSetupTransition] = useTransition()
  const [monthlyAmount, setMonthlyAmount] = useState<number>(0)
  const [description, setDescription] = useState<string>('Monthly Retainer')
  const [setupLink, setSetupLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const isActive =
    subscription !== null &&
    (subscription.status === 'active' || subscription.status === 'cancelling')

  // ── State A: No active subscription ────────────────────────────────────────
  if (!isActive) {
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      startTransition(async () => {
        const formData = new FormData()
        formData.set('clientId', clientId)
        formData.set('monthlyAmount', String(monthlyAmount))
        formData.set('description', description)
        formData.set('currency', 'aud')
        const result = await startSubscription(formData)
        if (result.success) {
          toast.success('Monthly retainer started — first invoice sent to client')
        } else {
          toast.error(result.error || 'Failed to start retainer')
        }
      })
    }

    const handleGenerateSetupLink = () => {
      startSetupTransition(async () => {
        const formData = new FormData()
        formData.set('clientId', clientId)
        const result = await createCardSetupLink(formData)
        if (result.success && result.url) {
          setSetupLink(result.url)
        } else {
          toast.error(result.error || 'Failed to generate setup link')
        }
      })
    }

    const handleCopy = async () => {
      if (!setupLink) return
      await navigator.clipboard.writeText(setupLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-neutral-500" />
            <CardTitle>Monthly Retainer</CardTitle>
          </div>
          <CardDescription>
            Start automatic monthly billing for this client
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="monthly-amount">Monthly Amount (AUD)</Label>
              <Input
                id="monthly-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={monthlyAmount || ''}
                onChange={(e) => setMonthlyAmount(parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="retainer-description">Description</Label>
              <Input
                id="retainer-description"
                type="text"
                defaultValue="Monthly Retainer"
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isPending || isSetupPending}>
              {isPending ? 'Starting...' : 'Start Retainer'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Client needs to add a card first?
              </span>
            </div>
          </div>

          {/* Setup link section */}
          {setupLink ? (
            <div className="space-y-2">
              <p className="text-sm text-neutral-600">
                Send this link to the client — they add their card via Stripe,
                then you can start the retainer:
              </p>
              <div className="flex gap-2">
                <Input
                  value={setupLink}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  aria-label="Copy link"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-neutral-400">
                This link expires after 24 hours. Generate a new one if needed.
              </p>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isSetupPending || isPending}
              onClick={handleGenerateSetupLink}
            >
              <Link2 className="h-4 w-4 mr-2" />
              {isSetupPending ? 'Generating...' : 'Generate Card Setup Link'}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // ── State B: Active or cancelling subscription ──────────────────────────────
  const handleCancel = () => {
    if (
      !window.confirm(
        "Cancel this client's monthly retainer? They will keep access until the end of the current billing period."
      )
    )
      return
    startTransition(async () => {
      const formData = new FormData()
      formData.set('clientId', clientId)
      const result = await cancelSubscription(formData)
      if (result.success) {
        toast.success('Retainer cancelled — active until end of billing period')
      } else {
        toast.error(result.error || 'Failed to cancel')
      }
    })
  }

  const formattedDate = subscription.currentPeriodEnd
    ? new Intl.DateTimeFormat('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(subscription.currentPeriodEnd))
    : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-neutral-500" />
            <CardTitle>Monthly Retainer</CardTitle>
          </div>
          {subscription.status === 'active' ? (
            <Badge className="bg-green-100 text-green-800">Active</Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-800">Cancelling</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscription.status === 'active' && formattedDate && (
          <p className="text-sm text-neutral-600">
            Next billing date: {formattedDate}
          </p>
        )}
        {subscription.status === 'cancelling' && formattedDate && (
          <p className="text-sm text-neutral-600">
            Subscription ends {formattedDate}
          </p>
        )}
        {subscription.status === 'active' && (
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isPending}
          >
            <XCircle className="h-4 w-4 mr-2" />
            {isPending ? 'Cancelling...' : 'Cancel Retainer'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
