'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPassword } from '@/app/actions/auth'
import { useEffect } from 'react'

interface ResetPasswordFormProps {
  token: string
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(
    resetPassword.bind(null, token),
    {}
  )

  // Redirect to login on success
  useEffect(() => {
    if (state.success) {
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
  }, [state.success, router])

  if (state.success) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
          Password reset successfully! Redirecting to login...
        </div>
        <Link href="/login">
          <Button className="w-full">Go to Login</Button>
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          required
          minLength={8}
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Re-enter your password"
          required
          minLength={8}
          disabled={isPending}
        />
      </div>
      {state.error && <p className="text-sm text-red-500">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Resetting...' : 'Reset Password'}
      </Button>
      <Link href="/login">
        <Button variant="outline" className="w-full">
          Back to Login
        </Button>
      </Link>
    </form>
  )
}
