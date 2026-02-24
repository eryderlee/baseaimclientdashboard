'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changePassword } from '@/app/actions/auth'

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePassword, {})

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          placeholder="Min. 8 characters"
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          disabled={isPending}
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-500">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-green-600">{state.message}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Updating...' : 'Update Password'}
        </Button>
      </div>
    </form>
  )
}
