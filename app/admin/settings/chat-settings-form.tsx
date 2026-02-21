'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { chatSettingsSchema, type ChatSettingsData, fbSettingsSchema, type FbSettingsData } from '@/lib/schemas/settings'
import { updateChatSettings, updateFbSettings } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useState, useTransition } from 'react'

interface ChatSettingsFormProps {
  defaultValues: ChatSettingsData
}

export function ChatSettingsForm({ defaultValues }: ChatSettingsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const form = useForm<ChatSettingsData>({
    resolver: zodResolver(chatSettingsSchema),
    defaultValues,
  })

  const { register, handleSubmit, formState: { isSubmitting } } = form

  // Submit handler
  const onSubmit = async (data: ChatSettingsData) => {
    setErrors({})

    // Build FormData from validated data
    const formData = new FormData()

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, value.toString())
      }
    })

    startTransition(async () => {
      const result = await updateChatSettings(formData)

      if (result?.error) {
        toast.error(result.error)
        if (result.errors) {
          setErrors(result.errors)
        }
      } else if (result?.success) {
        toast.success('Settings saved successfully')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Chat Integration Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Chat Integration</CardTitle>
          <CardDescription>
            Configure WhatsApp and Telegram contact details for client chat buttons
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* WhatsApp Number */}
          <div>
            <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
            <Input
              id="whatsappNumber"
              type="tel"
              placeholder="12025551234"
              {...register('whatsappNumber')}
              aria-invalid={!!errors.whatsappNumber}
              className="mt-1"
            />
            <p className="text-sm text-neutral-500 mt-1">
              Enter phone number in international format (digits only, no + or spaces). Example: 12025551234
            </p>
            {errors.whatsappNumber && (
              <p className="text-sm text-destructive mt-1">{errors.whatsappNumber[0]}</p>
            )}
          </div>

          {/* Telegram Username */}
          <div>
            <Label htmlFor="telegramUsername">Telegram Username</Label>
            <Input
              id="telegramUsername"
              type="text"
              placeholder="baseaim_support"
              {...register('telegramUsername')}
              aria-invalid={!!errors.telegramUsername}
              className="mt-1"
            />
            <p className="text-sm text-neutral-500 mt-1">
              Enter Telegram username without @ symbol
            </p>
            {errors.telegramUsername && (
              <p className="text-sm text-destructive mt-1">{errors.telegramUsername[0]}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || isPending} size="lg">
          {isSubmitting || isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  )
}

interface FbSettingsFormProps {
  defaultValues: FbSettingsData
}

export function FbSettingsForm({ defaultValues }: FbSettingsFormProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<FbSettingsData>({
    resolver: zodResolver(fbSettingsSchema),
    defaultValues,
  })

  const { register, handleSubmit, formState: { isSubmitting } } = form

  const onSubmit = async (data: FbSettingsData) => {
    const formData = new FormData()
    if (data.facebookAccessToken) {
      formData.append('facebookAccessToken', data.facebookAccessToken)
    }

    startTransition(async () => {
      const result = await updateFbSettings(formData)
      if (result?.error) {
        toast.error(result.error)
      } else if (result?.success) {
        toast.success('Facebook settings saved')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Facebook Ads Integration</CardTitle>
          <CardDescription>
            Configure the Meta Business Manager System User token for Facebook Ads analytics.
            Generate this token from Business Manager &rsaquo; Users &rsaquo; System Users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="facebookAccessToken">System User Access Token</Label>
            <Input
              id="facebookAccessToken"
              type="password"
              placeholder="EAABxx..."
              {...register('facebookAccessToken')}
              className="mt-1 font-mono text-sm"
            />
            <p className="text-sm text-neutral-500 mt-1">
              System User tokens do not expire. Store securely — token grants access to all configured ad accounts.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || isPending} size="lg">
          {isSubmitting || isPending ? 'Saving...' : 'Save Facebook Settings'}
        </Button>
      </div>
    </form>
  )
}
