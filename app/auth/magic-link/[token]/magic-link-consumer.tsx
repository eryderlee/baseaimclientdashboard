'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'

interface MagicLinkConsumerProps {
  token: string
}

/**
 * Calls signIn('credentials', { magicToken }) on mount.
 * NextAuth contacts authorize(), which atomically validates + deletes the token,
 * then redirects to /dashboard on success.
 */
export function MagicLinkConsumer({ token }: MagicLinkConsumerProps) {
  const [error, setError] = useState(false)

  useEffect(() => {
    signIn('credentials', {
      magicToken: token,
      callbackUrl: '/dashboard',
      redirect: false,
    }).then((result) => {
      if (result?.error) {
        setError(true)
      } else {
        window.location.href = '/dashboard'
      }
    })
  }, [token])

  if (error) {
    window.location.href = '/auth/magic-link/expired'
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Redirecting…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">Signing you in…</p>
    </div>
  )
}
