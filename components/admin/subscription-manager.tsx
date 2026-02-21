'use client'

import { useState, useTransition } from 'react'
import { RefreshCw, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { startSubscription, cancelSubscription } from '@/app/actions/billing'
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
  const [monthlyAmount, setMonthlyAmount] = useState<number>(0)
  const [description, setDescription] = useState<string>('Monthly Retainer')

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
        <CardContent>
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
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Starting...' : 'Start Retainer'}
            </Button>
          </form>
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
