'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { chatSettingsSchema, type ChatSettingsData } from '@/lib/schemas/settings'
import { updateChatSettings } from './actions'
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
